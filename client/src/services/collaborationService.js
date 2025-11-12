import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001';

class CollaborationService {
  constructor() {
    this.socket = null;
    this.currentProjectId = null;
    this.eventHandlers = new Map();
  }

  // Conectar ao WebSocket
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
      console.log('Conectado ao servidor de colaboração');
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado do servidor de colaboração');
    });

    this.socket.on('error', (error) => {
      console.error('Erro no socket:', error);
    });

    return this.socket;
  }

  // Desconectar do WebSocket
  disconnect() {
    if (this.socket) {
      if (this.currentProjectId) {
        this.leaveProject(this.currentProjectId);
      }
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Entrar em um projeto
  joinProject(projectId) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket não conectado');
      return;
    }

    this.currentProjectId = projectId;
    this.socket.emit('join-project', projectId);
  }

  // Sair de um projeto
  leaveProject(projectId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('leave-project', projectId);
    this.currentProjectId = null;
  }

  // Atualizar posição do cursor
  updateCursorPosition(projectId, cursorPosition) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('cursor-move', { projectId, cursorPosition });
  }

  // Solicitar bloqueio para editar uma track
  requestTrackLock(projectId, trackId) {
    if (!this.socket || !this.socket.connected) {
      return Promise.reject(new Error('Socket não conectado'));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('request-track-lock', { projectId, trackId });

      // Timeout de 5 segundos
      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao solicitar bloqueio'));
      }, 5000);

      // Aguardar resposta
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

  // Liberar bloqueio de uma track
  releaseTrackLock(projectId, trackId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('release-track-lock', { projectId, trackId });
  }

  // Enviar atualização do projeto
  sendProjectUpdate(projectId, changes) {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('project-update', { projectId, changes });
  }

  // Registrar evento
  on(event, handler) {
    if (!this.socket) {
      console.warn('Socket não inicializado');
      return;
    }

    this.socket.on(event, handler);
    
    // Armazenar handler para possível remoção posterior
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  // Remover evento
  off(event, handler) {
    if (!this.socket) {
      return;
    }

    this.socket.off(event, handler);

    // Remover do registro
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Limpar todos os eventos
  removeAllListeners() {
    if (!this.socket) {
      return;
    }

    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket.off(event, handler);
      });
    });

    this.eventHandlers.clear();
  }

  // ===== API REST para gerenciar colaboradores =====

  // Criar instância axios com autenticação
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

  // Listar colaboradores de um projeto
  async getCollaborators(projectId) {
    const api = this.getAxiosInstance();
    const response = await api.get(`/projects/${projectId}/collaborators`);
    return response.data;
  }

  // Adicionar colaborador
  async addCollaborator(projectId, userEmail, role = 'COLLABORATOR') {
    const api = this.getAxiosInstance();
    const response = await api.post(`/projects/${projectId}/collaborators`, {
      userEmail,
      role
    });
    return response.data;
  }

  // Atualizar colaborador
  async updateCollaborator(projectId, collaboratorId, role) {
    const api = this.getAxiosInstance();
    const response = await api.put(`/projects/${projectId}/collaborators/${collaboratorId}`, {
      role
    });
    return response.data;
  }

  // Remover colaborador
  async removeCollaborator(projectId, collaboratorId) {
    const api = this.getAxiosInstance();
    const response = await api.delete(`/projects/${projectId}/collaborators/${collaboratorId}`);
    return response.data;
  }
}

// Singleton
export const collaborationService = new CollaborationService();

