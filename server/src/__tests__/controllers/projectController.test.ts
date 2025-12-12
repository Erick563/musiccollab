import { Request, Response } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getCollaborators,
  addCollaborator,
  updateCollaborator,
  removeCollaborator
} from '../../controllers/projectController';
import { prisma } from '../../config/database';

// Mock do Prisma
jest.mock('../../config/database', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    projectCollaborator: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}));

describe('ProjectController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockRequest = {
      body: {},
      params: {},
      user: undefined
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    jest.clearAllMocks();
  });

  describe('getProjects', () => {
    it('deve retornar lista de projetos do usuário', async () => {
      const mockProjects = [
        {
          id: '1',
          title: 'Project 1',
          status: 'DRAFT',
          state: { tracks: [], masterVolume: 1, zoom: 1 },
          owner: { id: '1', name: 'User 1' },
          collaborators: [],
          tracks: [],
          _count: { tracks: 0, collaborators: 0 },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      (prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects);

      await getProjects(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        projects: expect.any(Array)
      });
    });

    it('deve retornar erro 401 se não autenticado', async () => {
      mockRequest.user = undefined;

      await getProjects(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuário não autenticado'
      });
    });
  });

  describe('getProject', () => {
    it('deve retornar um projeto específico', async () => {
      const mockProject = {
        id: '1',
        title: 'Project 1',
        status: 'DRAFT',
        state: {},
        ownerId: '1',
        owner: { id: '1', name: 'User 1' },
        collaborators: [],
        tracks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: '1' };
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);

      await getProject(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        project: expect.objectContaining({
          id: '1',
          title: 'Project 1'
        })
      });
    });

    it('deve retornar erro 404 se projeto não for encontrado', async () => {
      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: '999' };
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

      await getProject(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para acessá-lo'
      });
    });
  });

  describe('createProject', () => {
    it('deve criar um novo projeto', async () => {
      const mockProject = {
        id: '1',
        title: 'New Project',
        status: 'DRAFT',
        state: null,
        ownerId: '1',
        owner: { id: '1', name: 'User 1' },
        collaborators: [
          {
            id: 'c1',
            role: 'OWNER',
            user: { id: '1', name: 'User 1' }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.body = { title: 'New Project' };
      (prisma.project.create as jest.Mock).mockResolvedValue(mockProject);

      await createProject(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Projeto criado com sucesso',
        project: expect.objectContaining({
          title: 'New Project'
        })
      });
    });

    it('deve retornar erro 400 se título não for fornecido', async () => {
      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.body = { title: '' };

      await createProject(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Título do projeto é obrigatório'
      });
    });
  });

  describe('updateProject', () => {
    it('deve atualizar um projeto com sucesso', async () => {
      const existingProject = {
        id: '1',
        ownerId: '1',
        collaborators: []
      };

      const updatedProject = {
        id: '1',
        title: 'Updated Project',
        status: 'PUBLISHED',
        state: {},
        owner: { id: '1', name: 'User 1' },
        collaborators: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: '1' };
      mockRequest.body = { title: 'Updated Project' };
      
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(existingProject);
      (prisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

      await updateProject(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Projeto atualizado com sucesso',
        project: expect.objectContaining({
          title: 'Updated Project'
        })
      });
    });

    it('deve retornar erro 403 se usuário não tiver permissão', async () => {
      mockRequest.user = { id: '2', email: 'user2@example.com', name: 'User 2' };
      mockRequest.params = { id: '1' };
      mockRequest.body = { title: 'Updated Project' };
      
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

      await updateProject(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteProject', () => {
    it('deve deletar um projeto com sucesso', async () => {
      const existingProject = {
        id: '1',
        ownerId: '1'
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: '1' };
      
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(existingProject);
      (prisma.project.delete as jest.Mock).mockResolvedValue({});

      await deleteProject(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Projeto deletado com sucesso'
      });
    });

    it('deve retornar erro 404 se projeto não existir ou usuário não for dono', async () => {
      mockRequest.user = { id: '2', email: 'user2@example.com', name: 'User 2' };
      mockRequest.params = { id: '1' };
      
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

      await deleteProject(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para deletá-lo'
      });
    });
  });

  describe('addCollaborator', () => {
    it('deve adicionar um colaborador com sucesso', async () => {
      const mockProject = {
        id: '1',
        ownerId: '1'
      };

      const mockUserToAdd = {
        id: '2',
        name: 'User 2',
        email: 'user2@example.com'
      };

      const mockCollaborator = {
        id: 'c1',
        userId: '2',
        projectId: '1',
        role: 'COLLABORATOR',
        joinedAt: new Date(),
        user: mockUserToAdd
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { projectId: '1' };
      mockRequest.body = { userEmail: 'user2@example.com' };
      
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserToAdd);
      (prisma.projectCollaborator.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.projectCollaborator.create as jest.Mock).mockResolvedValue(mockCollaborator);

      await addCollaborator(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Colaborador adicionado com sucesso',
        collaborator: expect.objectContaining({
          role: 'COLLABORATOR'
        })
      });
    });

    it('deve retornar erro 400 se email não for fornecido', async () => {
      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { projectId: '1' };
      mockRequest.body = {};

      await addCollaborator(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Email do usuário é obrigatório'
      });
    });

    it('deve retornar erro 404 se usuário não for encontrado', async () => {
      const mockProject = { id: '1', ownerId: '1' };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { projectId: '1' };
      mockRequest.body = { userEmail: 'notfound@example.com' };
      
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await addCollaborator(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuário não encontrado'
      });
    });
  });

  describe('removeCollaborator', () => {
    it('deve remover um colaborador com sucesso', async () => {
      const mockProject = {
        id: '1',
        ownerId: '1'
      };

      const mockCollaborator = {
        id: 'c1',
        userId: '2'
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { projectId: '1', collaboratorId: 'c1' };
      
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectCollaborator.findUnique as jest.Mock).mockResolvedValue(mockCollaborator);
      (prisma.projectCollaborator.delete as jest.Mock).mockResolvedValue({});

      await removeCollaborator(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Colaborador removido com sucesso'
      });
    });

    it('deve retornar erro 403 ao tentar remover o proprietário', async () => {
      const mockProject = {
        id: '1',
        ownerId: '1'
      };

      const mockCollaborator = {
        id: 'c1',
        userId: '1' // Mesmo ID do proprietário
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { projectId: '1', collaboratorId: 'c1' };
      
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectCollaborator.findUnique as jest.Mock).mockResolvedValue(mockCollaborator);

      await removeCollaborator(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Não é possível remover o proprietário do projeto'
      });
    });
  });
});

