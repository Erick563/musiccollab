import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { collaborationService } from '../services/collaborationService';
import { useAuth } from './AuthContext';

const CollaborationContext = createContext();

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration deve ser usado dentro de um CollaborationProvider');
  }
  return context;
};

export const CollaborationProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lockedTracks, setLockedTracks] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const socketRef = useRef(null);

  // Conectar ao WebSocket quando o usuário estiver autenticado
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        socketRef.current = collaborationService.connect(token);
        
        // Eventos do socket
        collaborationService.on('connect', () => {
          setIsConnected(true);
        });

        collaborationService.on('disconnect', () => {
          setIsConnected(false);
          setOnlineUsers([]);
        });

        // Eventos de usuários
        collaborationService.on('online-users', (users) => {
          setOnlineUsers(users);
        });

        collaborationService.on('user-joined', (user) => {
          setOnlineUsers(prev => {
            // Verificar se o usuário já existe (evitar duplicação)
            const exists = prev.some(u => u.socketId === user.socketId);
            if (exists) {
              return prev;
            }
            return [...prev, user];
          });
        });

        collaborationService.on('user-left', ({ userId, socketId }) => {
          setOnlineUsers(prev => prev.filter(u => u.socketId !== socketId));
        });

        collaborationService.on('cursor-updated', ({ userId, socketId, cursorPosition }) => {
          setOnlineUsers(prev => prev.map(u => 
            u.socketId === socketId 
              ? { ...u, cursorPosition } 
              : u
          ));
        });

        // Eventos de bloqueio de tracks
        collaborationService.on('locked-tracks', (tracks) => {
          setLockedTracks(tracks);
        });

        collaborationService.on('track-locked', ({ trackId, userId, userName }) => {
          setLockedTracks(prev => [...prev, { trackId, userId, userName }]);
          
          // Atualizar status do usuário
          setOnlineUsers(prev => prev.map(u => 
            u.userId === userId 
              ? { ...u, isEditing: true, editingTrackId: trackId } 
              : u
          ));
        });

        collaborationService.on('track-unlocked', ({ trackId }) => {
          setLockedTracks(prev => prev.filter(t => t.trackId !== trackId));
          
          // Atualizar status dos usuários
          setOnlineUsers(prev => prev.map(u => 
            u.editingTrackId === trackId 
              ? { ...u, isEditing: false, editingTrackId: undefined } 
              : u
          ));
        });
      }
    }

    return () => {
      if (socketRef.current) {
        collaborationService.removeAllListeners();
        collaborationService.disconnect();
      }
    };
  }, [user]);

  // Entrar em um projeto
  const joinProject = useCallback((projectId) => {
    if (!isConnected) {
      console.warn('Socket não conectado');
      return;
    }

    if (currentProjectId && currentProjectId !== projectId) {
      collaborationService.leaveProject(currentProjectId);
    }

    collaborationService.joinProject(projectId);
    setCurrentProjectId(projectId);
  }, [isConnected, currentProjectId]);

  // Sair de um projeto
  const leaveProject = useCallback((projectId) => {
    collaborationService.leaveProject(projectId);
    setCurrentProjectId(null);
    setOnlineUsers([]);
    setLockedTracks([]);
  }, []);

  // Atualizar posição do cursor
  const updateCursor = useCallback((cursorPosition) => {
    if (currentProjectId && isConnected) {
      collaborationService.updateCursorPosition(currentProjectId, cursorPosition);
    }
  }, [currentProjectId, isConnected]);

  // Solicitar bloqueio de track
  const requestLock = useCallback(async (trackId) => {
    if (!currentProjectId) {
      throw new Error('Nenhum projeto ativo');
    }

    return collaborationService.requestTrackLock(currentProjectId, trackId);
  }, [currentProjectId]);

  // Liberar bloqueio de track
  const releaseLock = useCallback((trackId) => {
    if (currentProjectId) {
      collaborationService.releaseTrackLock(currentProjectId, trackId);
    }
  }, [currentProjectId]);

  // Verificar se uma track está bloqueada
  const isTrackLocked = useCallback((trackId) => {
    return lockedTracks.some(t => t.trackId === trackId);
  }, [lockedTracks]);

  // Obter quem está bloqueando uma track
  const getTrackLocker = useCallback((trackId) => {
    const lock = lockedTracks.find(t => t.trackId === trackId);
    return lock || null;
  }, [lockedTracks]);

  // Enviar atualização do projeto
  const sendUpdate = useCallback((changes) => {
    if (currentProjectId && isConnected) {
      collaborationService.sendProjectUpdate(currentProjectId, changes);
    }
  }, [currentProjectId, isConnected]);

  // Gerenciar colaboradores (API REST)
  const getCollaborators = useCallback(async (projectId) => {
    return collaborationService.getCollaborators(projectId);
  }, []);

  const addCollaborator = useCallback(async (projectId, userEmail, role) => {
    return collaborationService.addCollaborator(projectId, userEmail, role);
  }, []);

  const updateCollaboratorRole = useCallback(async (projectId, collaboratorId, role) => {
    return collaborationService.updateCollaborator(projectId, collaboratorId, role);
  }, []);

  const removeCollaborator = useCallback(async (projectId, collaboratorId) => {
    return collaborationService.removeCollaborator(projectId, collaboratorId);
  }, []);

  // Registrar listener de eventos customizados
  const on = useCallback((event, handler) => {
    collaborationService.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    collaborationService.off(event, handler);
  }, []);

  const value = {
    isConnected,
    onlineUsers,
    lockedTracks,
    currentProjectId,
    joinProject,
    leaveProject,
    updateCursor,
    requestLock,
    releaseLock,
    isTrackLocked,
    getTrackLocker,
    sendUpdate,
    getCollaborators,
    addCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
    on,
    off
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

