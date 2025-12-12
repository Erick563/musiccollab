import { authService } from '../authService';

// Mock completo do axios
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };
  return mockAxios;
});

const axios = require('axios');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const mockResponse = {
        data: {
          success: true,
          token: 'mock-token',
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com'
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('deve lançar erro ao falhar no login', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Credenciais inválidas'
          }
        }
      };

      axios.post.mockRejectedValue(mockError);

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toEqual(mockError);
    });
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123'
      };

      const mockResponse = {
        data: {
          success: true,
          token: 'mock-token',
          user: {
            id: '1',
            name: userData.name,
            email: userData.email
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await authService.register(userData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith('/auth/register', userData);
    });
  });

  describe('getProfile', () => {
    it('deve buscar o perfil do usuário autenticado', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com'
      };

      const mockResponse = {
        data: {
          success: true,
          user: mockUser
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await authService.getProfile();

      expect(result).toEqual(mockUser);
      expect(axios.get).toHaveBeenCalledWith('/auth/profile');
    });

    it('deve lançar erro 401 quando não autenticado', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Não autenticado'
          }
        }
      };

      axios.get.mockRejectedValue(mockError);

      await expect(authService.getProfile()).rejects.toEqual(mockError);
    });
  });

  describe('updateProfile', () => {
    it('deve atualizar o perfil com sucesso', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const mockResponse = {
        data: {
          success: true,
          message: 'Perfil atualizado',
          user: {
            id: '1',
            ...updateData
          }
        }
      };

      axios.put.mockResolvedValue(mockResponse);

      const result = await authService.updateProfile(updateData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.put).toHaveBeenCalledWith('/auth/profile', updateData);
    });
  });

  describe('changePassword', () => {
    it('deve alterar a senha com sucesso', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Senha alterada com sucesso'
        }
      };

      axios.put.mockResolvedValue(mockResponse);

      const result = await authService.changePassword('oldpass', 'newpass123');

      expect(result).toEqual(mockResponse.data);
      expect(axios.put).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'oldpass',
        newPassword: 'newpass123'
      });
    });

    it('deve lançar erro quando senha atual estiver incorreta', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Senha atual incorreta'
          }
        }
      };

      axios.put.mockRejectedValue(mockError);

      await expect(
        authService.changePassword('wrongpass', 'newpass123')
      ).rejects.toEqual(mockError);
    });
  });

  describe('forgotPassword', () => {
    it('deve enviar email de recuperação de senha', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Email enviado'
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await authService.forgotPassword('test@example.com');

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'test@example.com' });
    });
  });

  describe('resetPassword', () => {
    it('deve resetar a senha com token válido', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Senha resetada com sucesso'
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await authService.resetPassword('mock-token', 'newpass123');

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'mock-token',
        newPassword: 'newpass123'
      });
    });
  });
});
