import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Configurar axios com token padrão
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export const projectService = {
  // Listar projetos do usuário
  async getProjects() {
    const response = await api.get('/projects');
    return response.data.projects;
  },

  // Obter projeto por ID
  async getProject(id) {
    const response = await api.get(`/projects/${id}`);
    return response.data.project;
  },

  // Criar novo projeto
  async createProject(projectData) {
    const response = await api.post('/projects', projectData);
    return response.data.project;
  },

  // Atualizar projeto
  async updateProject(id, projectData) {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data.project;
  },

  // Deletar projeto
  async deleteProject(id) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};

