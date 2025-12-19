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
  const currentProjectIdRef = useRef(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    currentProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        socketRef.current = collaborationService.connect(token);

        collaborationService.on('connect', () => {
          setIsConnected(true);
        });

        collaborationService.on('disconnect', () => {
          setIsConnected(false);
          setOnlineUsers([]);
        });

        collaborationService.on('online-users', (users) => {
          setOnlineUsers(users);
        });

        collaborationService.on('user-joined', (user) => {
          setOnlineUsers(prev => {
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

        collaborationService.on('mouse-updated', ({ userId, socketId, mousePosition }) => {
          setOnlineUsers(prev => {
            const updated = prev.map(u =>
              u.socketId === socketId
                ? { ...u, mousePosition }
                : u
            );
            return updated;
          });
        });

        collaborationService.on('locked-tracks', (tracks) => {
          setLockedTracks(tracks);
        });

        collaborationService.on('track-locked', ({ trackId, userId, userName }) => {
          setLockedTracks(prev => [...prev, { trackId, userId, userName }]);

          setOnlineUsers(prev => prev.map(u =>
            u.userId === userId
              ? { ...u, isEditing: true, editingTrackId: trackId }
              : u
          ));
        });

        collaborationService.on('track-unlocked', ({ trackId }) => {
          setLockedTracks(prev => prev.filter(t => t.trackId !== trackId));

          setOnlineUsers(prev => prev.map(u =>
            u.editingTrackId === trackId
              ? { ...u, isEditing: false, editingTrackId: undefined }
              : u
          ));
        });


        const handleBeforeUnload = () => {
          if (currentProjectIdRef.current) {
            collaborationService.leaveProject(currentProjectIdRef.current);
          }
          collaborationService.disconnect();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          if (socketRef.current) {
            collaborationService.removeAllListeners();
            collaborationService.disconnect();
          }
        };
      }
    }

    return () => {
      if (socketRef.current) {
        collaborationService.removeAllListeners();
        collaborationService.disconnect();
      }
    };
  }, [user]);

  useEffect(() => {
    if (isConnected && currentProjectId) {
      collaborationService.joinProject(currentProjectId);
    }
  }, [isConnected, currentProjectId]);

  const joinProject = useCallback((projectId) => {

    if (currentProjectId && currentProjectId !== projectId) {
      if (isConnected) {
        collaborationService.leaveProject(currentProjectId);
      }
    }

    setCurrentProjectId(projectId);

    if (isConnected) {
      collaborationService.joinProject(projectId);
    } else {
      console.warn('Socket não conectado ao tentar entrar no projeto. O projeto será conectado quando o socket estiver pronto.');
    }
  }, [isConnected, currentProjectId]);

  const leaveProject = useCallback((projectId) => {
    collaborationService.leaveProject(projectId);
    setCurrentProjectId(null);
    setOnlineUsers([]);
    setLockedTracks([]);
  }, []);

  const updateCursor = useCallback((cursorPosition) => {
    if (currentProjectId && isConnected) {
      collaborationService.updateCursorPosition(currentProjectId, cursorPosition);
    }
  }, [currentProjectId, isConnected]);

  const updateMousePosition = useCallback((mousePosition) => {
    if (currentProjectId && isConnected) {
      collaborationService.updateMousePosition(currentProjectId, mousePosition);
    }
  }, [currentProjectId, isConnected]);

  const requestLock = useCallback(async (trackId) => {
    if (!currentProjectId) {
      throw new Error('Nenhum projeto ativo');
    }

    return collaborationService.requestTrackLock(currentProjectId, trackId);
  }, [currentProjectId]);

  const releaseLock = useCallback((trackId) => {
    if (currentProjectId) {
      collaborationService.releaseTrackLock(currentProjectId, trackId);
    }
  }, [currentProjectId]);

  const requestProjectLock = useCallback(async (operation) => {
    if (!currentProjectId) {
      throw new Error('Nenhum projeto ativo');
    }

    return collaborationService.requestProjectLock(currentProjectId, operation);
  }, [currentProjectId]);

  const releaseProjectLock = useCallback(() => {
    if (currentProjectId) {
      collaborationService.releaseProjectLock(currentProjectId);
    }
  }, [currentProjectId]);

  const isTrackLocked = useCallback((trackId) => {
    return lockedTracks.some(t => t.trackId === trackId);
  }, [lockedTracks]);

  const getTrackLocker = useCallback((trackId) => {
    const lock = lockedTracks.find(t => t.trackId === trackId);
    return lock || null;
  }, [lockedTracks]);

  const sendUpdate = useCallback((changes) => {
    if (currentProjectId && isConnected) {
      collaborationService.sendProjectUpdate(currentProjectId, changes);
    }
  }, [currentProjectId, isConnected]);

  const notifyTrackAdded = useCallback((track) => {
    const projId = currentProjectIdRef.current;
    const connected = isConnectedRef.current;
    if (projId && connected) {
      collaborationService.notifyTrackAdded(projId, track);
    } else {
      console.warn('Não foi possível notificar track adicionada - projId:', projId, 'connected:', connected);
    }
  }, []);

  const notifyTrackUpdated = useCallback((trackId, updates) => {
    const projId = currentProjectIdRef.current;
    const connected = isConnectedRef.current;
    if (projId && connected) {
      collaborationService.notifyTrackUpdated(projId, trackId, updates);
    } else {
      console.warn('Não foi possível notificar track atualizada - projId:', projId, 'connected:', connected);
    }
  }, []);

  const notifyTrackDeleted = useCallback((trackId) => {
    const projId = currentProjectIdRef.current;
    const connected = isConnectedRef.current;
    if (projId && connected) {
      collaborationService.notifyTrackDeleted(projId, trackId);
    } else {
      console.warn('Não foi possível notificar track deletada - projId:', projId, 'connected:', connected);
    }
  }, []);

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
    updateMousePosition,
    requestLock,
    releaseLock,
    requestProjectLock,
    releaseProjectLock,
    isTrackLocked,
    getTrackLocker,
    sendUpdate,
    notifyTrackAdded,
    notifyTrackUpdated,
    notifyTrackDeleted,
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

