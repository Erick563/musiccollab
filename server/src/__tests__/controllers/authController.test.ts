import { Request, Response } from 'express';
import { register, login, getProfile, updateProfile, changePassword } from '../../controllers/authController';
import { User } from '../../models/User';
import { generateToken } from '../../middleware/auth';

// Mock das dependências
jest.mock('../../models/User');
jest.mock('../../middleware/auth');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockRequest = {
      body: {},
      user: undefined
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: '1',
        ...userData
      };

      const mockToken = 'mock-jwt-token';

      mockRequest.body = userData;
      (User.create as jest.Mock).mockResolvedValue(mockUser);
      (generateToken as jest.Mock).mockReturnValue(mockToken);
      (User.toPublic as jest.Mock).mockReturnValue({ id: mockUser.id, name: mockUser.name, email: mockUser.email });

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Usuário criado com sucesso',
        user: expect.any(Object),
        token: mockToken
      });
    });

    it('deve retornar erro 400 se campos obrigatórios estiverem faltando', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Nome, email e senha são obrigatórios'
      });
    });

    it('deve retornar erro 400 se a senha for muito curta', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: '12345'
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    });

    it('deve retornar erro 400 se o email for inválido', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Formato de email inválido'
      });
    });

    it('deve retornar erro 409 se o email já estiver em uso', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123'
      };

      (User.create as jest.Mock).mockRejectedValue(new Error('Email já está em uso'));

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Email já está em uso'
      });
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: loginData.email
      };

      const mockToken = 'mock-jwt-token';

      mockRequest.body = loginData;
      (User.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (User.validatePassword as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue(mockToken);
      (User.toPublic as jest.Mock).mockReturnValue(mockUser);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Login realizado com sucesso',
        user: mockUser,
        token: mockToken
      });
    });

    it('deve retornar erro 400 se email ou senha estiverem faltando', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    });

    it('deve retornar erro 401 se o usuário não for encontrado', async () => {
      mockRequest.body = {
        email: 'notfound@example.com',
        password: 'password123'
      };

      (User.findByEmail as jest.Mock).mockResolvedValue(null);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Credenciais inválidas'
      });
    });

    it('deve retornar erro 401 se a senha for incorreta', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com'
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      (User.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (User.validatePassword as jest.Mock).mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Credenciais inválidas'
      });
    });
  });

  describe('getProfile', () => {
    it('deve retornar o perfil do usuário autenticado', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com'
      };

      mockRequest.user = { id: '1', email: 'test@example.com', name: 'Test User' };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.toPublic as jest.Mock).mockReturnValue(mockUser);

      await getProfile(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: mockUser
      });
    });

    it('deve retornar erro 401 se o usuário não estiver autenticado', async () => {
      mockRequest.user = undefined;

      await getProfile(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuário não autenticado'
      });
    });

    it('deve retornar erro 404 se o usuário não for encontrado', async () => {
      mockRequest.user = { id: '1', email: 'test@example.com', name: 'Test User' };
      (User.findById as jest.Mock).mockResolvedValue(null);

      await getProfile(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuário não encontrado'
      });
    });
  });

  describe('updateProfile', () => {
    it('deve atualizar o perfil com sucesso', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const mockUpdatedUser = {
        id: '1',
        ...updateData
      };

      mockRequest.user = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockRequest.body = updateData;
      (User.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);
      (User.toPublic as jest.Mock).mockReturnValue(mockUpdatedUser);

      await updateProfile(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Perfil atualizado com sucesso',
        user: mockUpdatedUser
      });
    });

    it('deve retornar erro 400 se o email for inválido', async () => {
      mockRequest.user = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockRequest.body = { email: 'invalid-email' };

      await updateProfile(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Formato de email inválido'
      });
    });
  });

  describe('changePassword', () => {
    it('deve alterar a senha com sucesso', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com'
      };

      mockRequest.user = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockRequest.body = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.validatePassword as jest.Mock).mockResolvedValue(true);
      (User.updateProfile as jest.Mock).mockResolvedValue(mockUser);

      await changePassword(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    });

    it('deve retornar erro 400 se as senhas não forem fornecidas', async () => {
      mockRequest.user = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockRequest.body = { currentPassword: 'oldpassword' };

      await changePassword(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    });

    it('deve retornar erro 400 se a nova senha for muito curta', async () => {
      mockRequest.user = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockRequest.body = {
        currentPassword: 'oldpassword',
        newPassword: '12345'
      };

      await changePassword(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'A nova senha deve ter pelo menos 6 caracteres'
      });
    });

    it('deve retornar erro 401 se a senha atual estiver incorreta', async () => {
      const mockUser = { id: '1' };

      mockRequest.user = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockRequest.body = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.validatePassword as jest.Mock).mockResolvedValue(false);

      await changePassword(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Senha atual incorreta'
      });
    });
  });
});

