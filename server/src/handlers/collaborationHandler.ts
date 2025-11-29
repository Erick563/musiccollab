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

// Armazena informações sobre as salas/projetos ativos
const projectRooms = new Map<string, ProjectRoom>();

// Armazena qual track está sendo editada (bloqueada)
const trackLocks = new Map<string, { userId: string; userName: string; socketId: string }>();

export const setupCollaborationHandlers = (io: Server) => {
  // Middleware para autenticação do socket
  io.use(async (socket: SocketWithUser, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as { userId: string };

      // Buscar informações do usuário
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      socket.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };
      next();
    } catch (error) {
      next(new Error('Autenticação falhou'));
    }
  });

  io.on('connection', (socket: SocketWithUser) => {

    // Entrar em um projeto (sala)
    socket.on('join-project', async (projectId: string) => {
      try {
        if (!socket.user) return;

        // Verificar se o usuário tem permissão para acessar o projeto
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
          }
        });

        if (!project) {
          socket.emit('error', { message: 'Você não tem permissão para acessar este projeto' });
          return;
        }

        // Sair de qualquer sala anterior
        const previousRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        previousRooms.forEach(room => {
          socket.leave(room);
          const roomData = projectRooms.get(room);
          if (roomData) {
            roomData.users.delete(socket.id);
            // Notificar outros usuários que este usuário saiu
            socket.to(room).emit('user-left', {
              userId: socket.user?.id,
              socketId: socket.id
            });
          }
        });

        // Entrar na sala do projeto
        socket.join(projectId);

        // Adicionar usuário à sala
        if (!projectRooms.has(projectId)) {
          projectRooms.set(projectId, {
            projectId,
            users: new Map()
          });
        }

        const room = projectRooms.get(projectId)!;
        
        // Remover conexões antigas do mesmo usuário (em caso de reconexão/atualização de página)
        const oldSocketIds: string[] = [];
        room.users.forEach((user, socketId) => {
          if (user.userId === socket.user!.id && socketId !== socket.id) {
            oldSocketIds.push(socketId);
          }
        });
        
        // Remover conexões antigas e notificar outros usuários
        oldSocketIds.forEach(oldSocketId => {
          room.users.delete(oldSocketId);
          
          // Liberar locks da conexão antiga
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
        
        // Adicionar nova conexão
        room.users.set(socket.id, {
          socketId: socket.id,
          userId: socket.user.id,
          userName: socket.user.name,
          cursorPosition: 0,
          isEditing: false
        });

        // Obter lista de usuários online
        const onlineUsers = Array.from(room.users.values()).map(user => ({
          userId: user.userId,
          userName: user.userName,
          socketId: user.socketId,
          cursorPosition: user.cursorPosition,
          mousePosition: user.mousePosition,
          isEditing: user.isEditing,
          editingTrackId: user.editingTrackId
        }));

        // Enviar lista de usuários online para o novo usuário
        socket.emit('online-users', onlineUsers);

        // Notificar outros usuários sobre o novo usuário
        socket.to(projectId).emit('user-joined', {
          userId: socket.user.id,
          userName: socket.user.name,
          socketId: socket.id,
          cursorPosition: 0,
          mousePosition: undefined,
          isEditing: false
        });

        // Enviar informações sobre tracks bloqueadas
        const lockedTracks = Array.from(trackLocks.entries())
          .filter(([trackId]) => trackId.startsWith(projectId))
          .map(([trackId, lock]) => ({
            trackId: trackId.replace(`${projectId}-`, ''),
            userId: lock.userId,
            userName: lock.userName
          }));

        socket.emit('locked-tracks', lockedTracks);

        // Solicitar estado atual do projeto de um usuário já conectado
        // Enviar para o primeiro usuário encontrado (exceto o novo usuário)
        const existingUsers = Array.from(room.users.values()).filter(u => u.socketId !== socket.id);

        // Pedir ao primeiro usuário conectado para enviar seu estado
        if (existingUsers.length > 0) {
          const firstUser = existingUsers[0];
          io.to(firstUser.socketId).emit('request-project-state', {
            forUserId: socket.user.id,
            forSocketId: socket.id
          });
        }

      } catch (error) {
        console.error('Erro ao entrar no projeto:', error);
        socket.emit('error', { message: 'Erro ao entrar no projeto' });
      }
    });

    // Sair de um projeto
    socket.on('leave-project', (projectId: string) => {
      handleLeaveProject(socket, projectId);
    });

    // Atualizar posição do cursor (tempo de playback)
    socket.on('cursor-move', (data: { projectId: string; cursorPosition: number }) => {
      const { projectId, cursorPosition } = data;
      const room = projectRooms.get(projectId);
      
      if (room && socket.user) {
        const user = room.users.get(socket.id);
        if (user) {
          user.cursorPosition = cursorPosition;
          
          // Notificar outros usuários sobre a nova posição do cursor
          socket.to(projectId).emit('cursor-updated', {
            userId: socket.user.id,
            socketId: socket.id,
            cursorPosition
          });
        }
      }
    });

    // Atualizar posição do mouse
    socket.on('mouse-move', (data: { projectId: string; mousePosition: { x: number; y: number } }) => {
      const { projectId, mousePosition } = data;
      
      const room = projectRooms.get(projectId);
      
      if (room && socket.user) {
        const user = room.users.get(socket.id);
        if (user) {
          user.mousePosition = mousePosition;
        }
      }
      
      // Propagar para outros usuários no projeto
      socket.to(projectId).emit('mouse-updated', {
        userId: socket.user?.id,
        socketId: socket.id,
        mousePosition
      });
    });

    // Solicitar bloqueio para editar uma track
    socket.on('request-track-lock', (data: { projectId: string; trackId: string }) => {
      const { projectId, trackId } = data;
      const lockKey = `${projectId}-${trackId}`;
      
      if (!socket.user) return;

      // Verificar se a track já está bloqueada
      const existingLock = trackLocks.get(lockKey);
      
      if (existingLock && existingLock.socketId !== socket.id) {
        // Track já está sendo editada por outro usuário
        socket.emit('track-lock-denied', {
          trackId,
          lockedBy: {
            userId: existingLock.userId,
            userName: existingLock.userName
          }
        });
        return;
      }

      // Conceder bloqueio
      trackLocks.set(lockKey, {
        userId: socket.user.id,
        userName: socket.user.name,
        socketId: socket.id
      });

      // Atualizar status do usuário
      const room = projectRooms.get(projectId);
      if (room) {
        const user = room.users.get(socket.id);
        if (user) {
          user.isEditing = true;
          user.editingTrackId = trackId;
        }
      }

      // Confirmar bloqueio para o solicitante
      socket.emit('track-lock-granted', { trackId });

      // Notificar outros usuários sobre o bloqueio
      socket.to(projectId).emit('track-locked', {
        trackId,
        userId: socket.user.id,
        userName: socket.user.name
      });

    });

    // Liberar bloqueio de uma track
    socket.on('release-track-lock', (data: { projectId: string; trackId: string }) => {
      const { projectId, trackId } = data;
      releaseLock(socket, projectId, trackId);
    });

    // Sincronizar mudanças no projeto em tempo real (opcional)
    socket.on('project-update', (data: { projectId: string; changes: any }) => {
      const { projectId, changes } = data;
      
      // Propagar mudanças para outros usuários
      socket.to(projectId).emit('project-changed', {
        userId: socket.user?.id,
        userName: socket.user?.name,
        changes
      });
    });

    // Sincronizar adição de track
    socket.on('track-added', (data: { projectId: string; track: any }) => {
      const { projectId, track } = data;
      
      
      // Propagar para outros usuários no projeto
      socket.to(projectId).emit('track-added', {
        userId: socket.user?.id,
        userName: socket.user?.name,
        track
      });
      
      
      // Verificar quantos sockets estão na sala
      const socketsInRoom = io.sockets.adapter.rooms.get(projectId);
    });

    // Sincronizar atualização de track
    socket.on('track-updated', (data: { projectId: string; trackId: string | number; updates: any }) => {
      const { projectId, trackId, updates } = data;
      
      
      // Propagar para outros usuários no projeto
      const emittedData = {
        userId: socket.user?.id,
        userName: socket.user?.name,
        trackId,
        updates
      };
      
      socket.to(projectId).emit('track-updated', emittedData);
      
      // Verificar quantos sockets estão na sala
      const socketsInRoom = io.sockets.adapter.rooms.get(projectId);
    });

    // Sincronizar deleção de track
    socket.on('track-deleted', (data: { projectId: string; trackId: string | number }) => {
      const { projectId, trackId } = data;
      
      
      // Propagar para outros usuários no projeto
      socket.to(projectId).emit('track-deleted', {
        userId: socket.user?.id,
        userName: socket.user?.name,
        trackId
      });
    });

    // Enviar estado do projeto para um usuário específico
    socket.on('send-project-state', (data: { forSocketId: string; projectState: any }) => {
      const { forSocketId, projectState } = data;
      
      if (projectState?.tracks) {
      }
      
      // Enviar estado apenas para o usuário específico
      io.to(forSocketId).emit('receive-project-state', {
        fromUserId: socket.user?.id,
        fromUserName: socket.user?.name,
        projectState
      });
      
    });

    // Desconexão
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });

  // Função auxiliar para liberar bloqueio
  function releaseLock(socket: SocketWithUser, projectId: string, trackId: string) {
    const lockKey = `${projectId}-${trackId}`;
    const lock = trackLocks.get(lockKey);

    if (lock && lock.socketId === socket.id) {
      trackLocks.delete(lockKey);

      // Atualizar status do usuário
      const room = projectRooms.get(projectId);
      if (room) {
        const user = room.users.get(socket.id);
        if (user) {
          user.isEditing = false;
          user.editingTrackId = undefined;
        }
      }

      // Notificar outros usuários
      socket.to(projectId).emit('track-unlocked', { trackId });

    }
  }

  // Função auxiliar para sair de um projeto
  function handleLeaveProject(socket: SocketWithUser, projectId: string) {
    const room = projectRooms.get(projectId);
    
    if (room && socket.user) {
      const user = room.users.get(socket.id);
      
      // Liberar qualquer bloqueio que o usuário tenha
      if (user && user.editingTrackId) {
        releaseLock(socket, projectId, user.editingTrackId);
      }

      // Remover usuário da sala
      room.users.delete(socket.id);

      // Notificar outros usuários
      socket.to(projectId).emit('user-left', {
        userId: socket.user.id,
        socketId: socket.id
      });

      // Remover sala se estiver vazia
      if (room.users.size === 0) {
        projectRooms.delete(projectId);
      }

      socket.leave(projectId);
    }
  }

  // Função auxiliar para desconexão
  function handleDisconnect(socket: SocketWithUser) {

    // Encontrar todas as salas em que o usuário estava
    const userRooms = Array.from(socket.rooms).filter(room => room !== socket.id);

    userRooms.forEach(projectId => {
      handleLeaveProject(socket, projectId);
    });

    // Liberar todos os bloqueios do usuário
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

