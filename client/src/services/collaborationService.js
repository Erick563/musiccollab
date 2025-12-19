import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

class CollaborationService {
  constructor() {
    this.socket = null;
    this.currentProjectId = null;
    this.eventHandlers = new Map();
  }

  connect(token) {
    
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket conectado! ID:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket desconectado. Razão:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Erro no socket:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      if (this.currentProjectId) {
        this.leaveProject(this.currentProjectId);
      }
      this.socket.disconnect();
      this.socket = null;
      this.currentProjectId = null;
      
    }
  }

  joinProject(projectId) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket não conectado');
      return;
    }

    this.currentProjectId = projectId;
    this.socket.emit('join-project', projectId);
  }

  leaveProject(projectId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('leave-project', projectId);
    this.currentProjectId = null;
  }

  updateCursorPosition(projectId, cursorPosition) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('cursor-move', { projectId, cursorPosition });
  }

  updateMousePosition(projectId, mousePosition) {
    
    if (!this.socket || !this.socket.connected) {
      console.warn('[CollaborationService] ❌ Socket não conectado - socket:', !!this.socket, 'connected:', this.socket?.connected);
      return;
    }

    this.socket.emit('mouse-move', { projectId, mousePosition });
  }

  requestTrackLock(projectId, trackId) {
    if (!this.socket || !this.socket.connected) {
      return Promise.reject(new Error('Socket não conectado'));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('request-track-lock', { projectId, trackId });

      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao solicitar bloqueio'));
      }, 5000);

      this.socket.once('track-lock-granted', (data) => {
        clearTimeout(timeout);
        if (data.trackId === trackId) {
          resolve(data);
        }
      });

      this.socket.once('track-lock-denied', (data) => {
        clearTimeout(timeout);
        if (data.trackId === trackId) {
          reject(new Error(`Track bloqueada por ${data.lockedBy.userName}`));
        }
      });
    });
  }

  releaseTrackLock(projectId, trackId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('release-track-lock', { projectId, trackId });
  }

  requestProjectLock(projectId, operation) {
    if (!this.socket || !this.socket.connected) {
      return Promise.reject(new Error('Socket não conectado'));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('request-project-lock', { projectId, operation });

      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao solicitar bloqueio do projeto'));
      }, 10000);

      this.socket.once('project-lock-granted', (data) => {
        clearTimeout(timeout);
        if (data.projectId === projectId) {
          resolve(data);
        }
      });

      this.socket.once('project-lock-denied', (data) => {
        clearTimeout(timeout);
        if (data.lockedBy) {
          reject(new Error(`Projeto bloqueado por ${data.lockedBy.userName} (${data.lockedBy.operation})`));
        } else {
          reject(new Error(data.message || 'Bloqueio negado'));
        }
      });
    });
  }

  releaseProjectLock(projectId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('release-project-lock', { projectId });
  }

  sendProjectUpdate(projectId, changes) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('project-update', { projectId, changes });
  }

  notifyTrackAdded(projectId, track) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket não conectado ao notificar track adicionada');
      return;
    }

    this.socket.emit('track-added', { projectId, track });
  }

  notifyTrackUpdated(projectId, trackId, updates) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket não conectado ao notificar track atualizada');
      return;
    }

    this.socket.emit('track-updated', { projectId, trackId, updates });
  }

  notifyTrackDeleted(projectId, trackId) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket não conectado ao notificar track deletada');
      return;
    }

    this.socket.emit('track-deleted', { projectId, trackId });
  }

  on(event, handler) {
    if (!this.socket) {
      console.warn('⚠️ Socket não inicializado ao tentar registrar evento:', event);
      return;
    }
    
    const wrappedHandler = (data) => {
      handler(data);
    };
    
    this.socket.on(event, wrappedHandler);
    
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push({ original: handler, wrapped: wrappedHandler });
  }

  off(event, handler) {
    if (!this.socket) {
      return;
    }

    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const handlerObj = handlers.find(h => h.original === handler);
      
      if (handlerObj) {
        this.socket.off(event, handlerObj.wrapped);
        
        const index = handlers.indexOf(handlerObj);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  removeAllListeners() {
    if (!this.socket) {
      return;
    }

    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handlerObj => {
        this.socket.off(event, handlerObj.wrapped);
      });
    });

    this.eventHandlers.clear();
  }

  getAxiosInstance() {
    const token = localStorage.getItem('token');
    return axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }

  async getCollaborators(projectId) {
    const api = this.getAxiosInstance();
    const response = await api.get(`/projects/${projectId}/collaborators`);
    return response.data;
  }

  async addCollaborator(projectId, userEmail, role = 'COLLABORATOR') {
    const api = this.getAxiosInstance();
    const response = await api.post(`/projects/${projectId}/collaborators`, {
      userEmail,
      role
    });
    return response.data;
  }

  async updateCollaborator(projectId, collaboratorId, role) {
    const api = this.getAxiosInstance();
    const response = await api.put(`/projects/${projectId}/collaborators/${collaboratorId}`, {
      role
    });
    return response.data;
  }

  async removeCollaborator(projectId, collaboratorId) {
    const api = this.getAxiosInstance();
    const response = await api.delete(`/projects/${projectId}/collaborators/${collaboratorId}`);
    return response.data;
  }
}

export const collaborationService = new CollaborationService();