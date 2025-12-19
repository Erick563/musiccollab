import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  async getProjects() {
    const response = await api.get('/projects');
    return response.data.projects;
  },

  async getProject(id) {
    const response = await api.get(`/projects/${id}`);
    return response.data.project;
  },

  async createProject(projectData) {
    const response = await api.post('/projects', projectData);
    return response.data.project;
  },

  async updateProject(id, projectData) {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data.project;
  },

  async deleteProject(id) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};

