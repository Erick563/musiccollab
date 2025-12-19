import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

interface UserData {
  id: string;
  name: string;
  email: string;
}

interface SocketWithUser extends Socket {
  user?: UserData;
}

interface ProjectRoom {
  projectId: string;
  users: Map<string, {
    socketId: string;
    userId: string;
    userName: string;
    cursorPosition?: number;
    mousePosition?: { x: number; y: number };
    isEditing: boolean;
    editingTrackId?: string;
  }>;
}

const projectRooms = new Map<string, ProjectRoom>();

const trackLocks = new Map<string, { userId: string; userName: string; socketId: string }>();

const projectGlobalLocks = new Map<string, { userId: string; userName: string; socketId: string; operation: string }>();

function cleanupMemory(io: Server) {
  const emptyRooms: string[] = [];
  projectRooms.forEach((room, projectId) => {
    if (room.users.size === 0) {
      emptyRooms.push(projectId);
    }
  });
  emptyRooms.forEach(projectId => projectRooms.delete(projectId));

  const orphanLocks: string[] = [];
  trackLocks.forEach((lock, lockKey) => {
    const socketExists = io.sockets.sockets.has(lock.socketId);
    if (!socketExists) {
      orphanLocks.push(lockKey);
    }
  });
  orphanLocks.forEach(lockKey => trackLocks.delete(lockKey));

  const orphanGlobalLocks: string[] = [];
  projectGlobalLocks.forEach((lock, projectId) => {
    const socketExists = io.sockets.sockets.has(lock.socketId);
    if (!socketExists) {
      orphanGlobalLocks.push(projectId);
    }
  });
  orphanGlobalLocks.forEach(projectId => projectGlobalLocks.delete(projectId));

  if (emptyRooms.length > 0 || orphanLocks.length > 0 || orphanGlobalLocks.length > 0) {
    console.log(`[Cleanup] Removidas ${emptyRooms.length} salas vazias, ${orphanLocks.length} locks órfãos e ${orphanGlobalLocks.length} locks globais órfãos`);
  }
}

export const setupCollaborationHandlers = (io: Server) => {
  setInterval(() => cleanupMemory(io), 5 * 60 * 1000);
  io.use(async (socket: SocketWithUser, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        console.log('[Socket Auth] Token não fornecido');
        return next(new Error('Token não fornecido'));
      }

      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      if (!user) {
        console.log('[Socket Auth] Usuário não encontrado:', decoded.userId);
        return next(new Error('Usuário não encontrado'));
      }

      socket.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };
      next();
    } catch (error) {
      console.error('[Socket Auth] Erro na autenticação:', error);
      next(new Error('Autenticação falhou'));
    }
  });

  io.engine.on("connection_error", (err) => {
    console.error('[Socket.IO] Erro de conexão:', {
      code: err.code,
      message: err.message,
      context: err.context
    });
  });

  io.on('connection', (socket: SocketWithUser) => {
    console.log(`[Socket] Nova conexão: ${socket.id} - Usuário: ${socket.user?.name || 'Desconhecido'}`);

    socket.on('error', (error) => {
      console.error(`[Socket] Erro no socket ${socket.id}:`, error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Desconexão ${socket.id} - Razão: ${reason} - Usuário: ${socket.user?.name || 'Desconhecido'}`);
      handleDisconnect(socket);
    });

    socket.on('join-project', async (projectId: string) => {
      try {
        if (!socket.user) return;

        const project = await prisma.project.findFirst({
          where: {
            id: projectId,
            OR: [
              { ownerId: socket.user.id },
              {
                collaborators: {
                  some: {
                    userId: socket.user.id
                  }
                }
              }
            ]
          },
          include: {
            collaborators: {
              where: {
                userId: socket.user.id
              }
            }
          }
        });

        if (!project) {
          socket.emit('error', { message: 'Você não tem permissão para acessar este projeto' });
          return;
        }

        const userCollaborator = project.collaborators[0];
        const userRole = project.ownerId === socket.user.id ? 'OWNER' : (userCollaborator?.role || 'VIEWER');
        (socket as any).userRole = userRole;

        const previousRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        previousRooms.forEach(room => {
          socket.leave(room);
          const roomData = projectRooms.get(room);
          if (roomData) {
            roomData.users.delete(socket.id);
            socket.to(room).emit('user-left', {
              userId: socket.user?.id,
              socketId: socket.id
            });
          }
        });

        socket.join(projectId);

        if (!projectRooms.has(projectId)) {
          projectRooms.set(projectId, {
            projectId,
            users: new Map()
          });
        }

        const room = projectRooms.get(projectId)!;
        
        const oldSocketIds: string[] = [];
        room.users.forEach((user, socketId) => {
          if (user.userId === socket.user!.id && socketId !== socket.id) {
            oldSocketIds.push(socketId);
          }
        });
        
        oldSocketIds.forEach(oldSocketId => {
          room.users.delete(oldSocketId);
          
          const locksToRelease: string[] = [];
          trackLocks.forEach((lock, lockKey) => {
            if (lock.socketId === oldSocketId) {
              locksToRelease.push(lockKey);
            }
          });
          
          locksToRelease.forEach(lockKey => {
            trackLocks.delete(lockKey);
            const trackId = lockKey.replace(`${projectId}-`, '');
            socket.to(projectId).emit('track-unlocked', { trackId });
          });
          
          socket.to(projectId).emit('user-left', {
            userId: socket.user!.id,
            socketId: oldSocketId
          });
        });
        
        room.users.set(socket.id, {
          socketId: socket.id,
          userId: socket.user.id,
          userName: socket.user.name,
          cursorPosition: 0,
          isEditing: false
        });

        const onlineUsers = Array.from(room.users.values()).map(user => ({
          userId: user.userId,
          userName: user.userName,
          socketId: user.socketId,
          cursorPosition: user.cursorPosition,
          mousePosition: user.mousePosition,
          isEditing: user.isEditing,
          editingTrackId: user.editingTrackId
        }));

        socket.emit('online-users', onlineUsers);

        socket.to(projectId).emit('user-joined', {
          userId: socket.user.id,
          userName: socket.user.name,
          socketId: socket.id,
          cursorPosition: 0,
          mousePosition: undefined,
          isEditing: false
        });

        const lockedTracks = Array.from(trackLocks.entries())
          .filter(([trackId]) => trackId.startsWith(projectId))
          .map(([trackId, lock]) => ({
            trackId: trackId.replace(`${projectId}-`, ''),
            userId: lock.userId,
            userName: lock.userName
          }));

        socket.emit('locked-tracks', lockedTracks);

      } catch (error) {
        console.error('Erro ao entrar no projeto:', error);
        socket.emit('error', { message: 'Erro ao entrar no projeto' });
      }
    });

    socket.on('leave-project', (projectId: string) => {
      handleLeaveProject(socket, projectId);
    });

    socket.on('cursor-move', (data: { projectId: string; cursorPosition: number }) => {
      try {
        const { projectId, cursorPosition } = data;
        const room = projectRooms.get(projectId);
        
        if (room && socket.user) {
          const user = room.users.get(socket.id);
          if (user) {
            user.cursorPosition = cursorPosition;
            
            socket.to(projectId).emit('cursor-updated', {
              userId: socket.user.id,
              socketId: socket.id,
              cursorPosition
            });
          }
        }
      } catch (error) {
        console.error('[Socket] Erro em cursor-move:', error);
      }
    });

    socket.on('mouse-move', (data: { projectId: string; mousePosition: { x: number; y: number } }) => {
      try {
        const { projectId, mousePosition } = data;
        
        const room = projectRooms.get(projectId);
        
        if (room && socket.user) {
          const user = room.users.get(socket.id);
          if (user) {
            user.mousePosition = mousePosition;
          }
        }
        
        socket.to(projectId).emit('mouse-updated', {
          userId: socket.user?.id,
          socketId: socket.id,
          mousePosition
        });
      } catch (error) {
        console.error('[Socket] Erro em mouse-move:', error);
      }
    });

    socket.on('request-track-lock', (data: { projectId: string; trackId: string }) => {
      const { projectId, trackId } = data;
      const lockKey = `${projectId}-${trackId}`;
      
      if (!socket.user) return;

      const userRole = (socket as any).userRole;
      if (userRole === 'VIEWER') {
        socket.emit('track-lock-denied', {
          trackId,
          message: 'Usuários com permissão de visualização não podem editar tracks'
        });
        return;
      }

      const existingLock = trackLocks.get(lockKey);
      
      if (existingLock && existingLock.socketId !== socket.id) {
        socket.emit('track-lock-denied', {
          trackId,
          lockedBy: {
            userId: existingLock.userId,
            userName: existingLock.userName
          }
        });
        return;
      }

      trackLocks.set(lockKey, {
        userId: socket.user.id,
        userName: socket.user.name,
        socketId: socket.id
      });

      const room = projectRooms.get(projectId);
      if (room) {
        const user = room.users.get(socket.id);
        if (user) {
          user.isEditing = true;
          user.editingTrackId = trackId;
        }
      }

      socket.emit('track-lock-granted', { trackId });

      socket.to(projectId).emit('track-locked', {
        trackId,
        userId: socket.user.id,
        userName: socket.user.name
      });

    });

    socket.on('release-track-lock', (data: { projectId: string; trackId: string }) => {
      const { projectId, trackId } = data;
      releaseLock(socket, projectId, trackId);
    });

    socket.on('request-project-lock', (data: { projectId: string; operation: string }) => {
      const { projectId, operation } = data;
      
      if (!socket.user) return;

      const userRole = (socket as any).userRole;
      if (userRole === 'VIEWER') {
        socket.emit('project-lock-denied', {
          message: 'Usuários com permissão de visualização não podem realizar esta operação'
        });
        return;
      }

      const existingLock = projectGlobalLocks.get(projectId);
      
      if (existingLock && existingLock.socketId !== socket.id) {
        socket.emit('project-lock-denied', {
          lockedBy: {
            userId: existingLock.userId,
            userName: existingLock.userName,
            operation: existingLock.operation
          }
        });
        return;
      }

      projectGlobalLocks.set(projectId, {
        userId: socket.user.id,
        userName: socket.user.name,
        socketId: socket.id,
        operation
      });

      socket.emit('project-lock-granted', { projectId });

      socket.to(projectId).emit('project-locked', {
        userId: socket.user.id,
        userName: socket.user.name,
        operation
      });

      console.log(`[Project Lock] Projeto ${projectId} bloqueado por ${socket.user.name} para operação: ${operation}`);
    });

    socket.on('release-project-lock', (data: { projectId: string }) => {
      const { projectId } = data;
      releaseProjectLock(socket, projectId);
    });

    socket.on('project-update', (data: { projectId: string; changes: any }) => {
      const { projectId, changes } = data;
      
      const userRole = (socket as any).userRole;
      if (userRole === 'VIEWER') {
        socket.emit('error', { message: 'Usuários com permissão de visualização não podem fazer modificações' });
        return;
      }
      
      socket.to(projectId).emit('project-changed', {
        userId: socket.user?.id,
        userName: socket.user?.name,
        changes
      });
    });

    socket.on('track-added', (data: { projectId: string; track: any }) => {
      try {
        const { projectId, track } = data;
        
        const userRole = (socket as any).userRole;
        if (userRole === 'VIEWER') {
          socket.emit('error', { message: 'Usuários com permissão de visualização não podem adicionar tracks' });
          return;
        }
        
        socket.to(projectId).emit('track-added', {
          userId: socket.user?.id,
          userName: socket.user?.name,
          track
        });
        
        const socketsInRoom = io.sockets.adapter.rooms.get(projectId);
      } catch (error) {
        console.error('[Socket] Erro em track-added:', error);
        socket.emit('error', { message: 'Erro ao adicionar track' });
      }
    });

    socket.on('track-updated', (data: { projectId: string; trackId: string | number; updates: any }) => {
      try {
        const { projectId, trackId, updates } = data;
        
        const userRole = (socket as any).userRole;
        if (userRole === 'VIEWER') {
          socket.emit('error', { message: 'Usuários com permissão de visualização não podem modificar tracks' });
          return;
        }
        
        const emittedData = {
          userId: socket.user?.id,
          userName: socket.user?.name,
          trackId,
          updates
        };
        
        socket.to(projectId).emit('track-updated', emittedData);
        
        const socketsInRoom = io.sockets.adapter.rooms.get(projectId);
      } catch (error) {
        console.error('[Socket] Erro em track-updated:', error);
        socket.emit('error', { message: 'Erro ao atualizar track' });
      }
    });

    socket.on('track-deleted', (data: { projectId: string; trackId: string | number }) => {
      try {
        const { projectId, trackId } = data;
        
        const userRole = (socket as any).userRole;
        if (userRole === 'VIEWER') {
          socket.emit('error', { message: 'Usuários com permissão de visualização não podem deletar tracks' });
          return;
        }
        
        socket.to(projectId).emit('track-deleted', {
          userId: socket.user?.id,
          userName: socket.user?.name,
          trackId
        });
      } catch (error) {
        console.error('[Socket] Erro em track-deleted:', error);
        socket.emit('error', { message: 'Erro ao deletar track' });
      }
    });


  });

  function releaseLock(socket: SocketWithUser, projectId: string, trackId: string) {
    const lockKey = `${projectId}-${trackId}`;
    const lock = trackLocks.get(lockKey);

    if (lock && lock.socketId === socket.id) {
      trackLocks.delete(lockKey);

      const room = projectRooms.get(projectId);
      if (room) {
        const user = room.users.get(socket.id);
        if (user) {
          user.isEditing = false;
          user.editingTrackId = undefined;
        }
      }

      socket.to(projectId).emit('track-unlocked', { trackId });

    }
  }

  function releaseProjectLock(socket: SocketWithUser, projectId: string) {
    const lock = projectGlobalLocks.get(projectId);

    if (lock && lock.socketId === socket.id) {
      projectGlobalLocks.delete(projectId);

      socket.to(projectId).emit('project-unlocked', { projectId });

      console.log(`[Project Lock] Projeto ${projectId} desbloqueado por ${socket.user?.name}`);
    }
  }

  function handleLeaveProject(socket: SocketWithUser, projectId: string) {
    const room = projectRooms.get(projectId);
    
    if (room && socket.user) {
      const user = room.users.get(socket.id);
      
      if (user && user.editingTrackId) {
        releaseLock(socket, projectId, user.editingTrackId);
      }

      releaseProjectLock(socket, projectId);

      room.users.delete(socket.id);

      socket.to(projectId).emit('user-left', {
        userId: socket.user.id,
        socketId: socket.id
      });

      if (room.users.size === 0) {
        projectRooms.delete(projectId);
      }

      socket.leave(projectId);
    }
  }

  function handleDisconnect(socket: SocketWithUser) {

    const userRooms = Array.from(socket.rooms).filter(room => room !== socket.id);

    userRooms.forEach(projectId => {
      handleLeaveProject(socket, projectId);
    });

    const locksToRelease: string[] = [];
    trackLocks.forEach((lock, lockKey) => {
      if (lock.socketId === socket.id) {
        locksToRelease.push(lockKey);
      }
    });

    locksToRelease.forEach(lockKey => {
      const [projectId, trackId] = lockKey.split('-');
      releaseLock(socket, projectId, trackId);
    });
  }
};

