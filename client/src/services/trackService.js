import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

export const trackService = {
  async createTrack(projectId, file, trackData = {}, onProgress = null) {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('projectId', projectId);
    formData.append('name', trackData.name || file.name.replace(/\.[^/.]+$/, ''));
    if (trackData.description) formData.append('description', trackData.description);
    if (trackData.startTime !== undefined) formData.append('startTime', trackData.startTime);
    if (trackData.volume !== undefined) formData.append('volume', trackData.volume);
    if (trackData.pan !== undefined) formData.append('pan', trackData.pan);
    if (trackData.color) formData.append('color', trackData.color);

    console.log(`[TrackService] Iniciando upload de ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const response = await api.post('/tracks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutos de timeout para uploads
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`[TrackService] Upload progress: ${percentCompleted}%`);
        if (onProgress) {
          onProgress(percentCompleted);
        }
      },
    });
    
    console.log(`[TrackService] Upload concluído com sucesso!`);
    return response.data.track;
  },

  async getTrack(id) {
    const response = await api.get(`/tracks/${id}`);
    return response.data.track;
  },

  async getTrackAudio(id) {
    const response = await api.get(`/tracks/${id}/audio`);
    return response.data.audioUrl;
  },

  async downloadTrackAudio(id) {
    const response = await api.get(`/tracks/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getProjectTracks(projectId) {
    const response = await api.get(`/tracks/project/${projectId}`);
    return response.data.tracks;
  },

  async updateTrack(id, trackData) {
    const response = await api.put(`/tracks/${id}`, trackData);
    return response.data.track;
  },

  async deleteTrack(id) {
    const response = await api.delete(`/tracks/${id}`);
    return response.data;
  },
};

