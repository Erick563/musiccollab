import { Request, Response } from 'express';
import {
  createTrack,
  getTrack,
  downloadTrackAudio,
  getTrackAudio,
  getProjectTracks,
  updateTrack,
  deleteTrack
} from '../../controllers/trackController';
import { prisma } from '../../config/database';

// Mock do Prisma
jest.mock('../../config/database', () => ({
  prisma: {
    track: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    project: {
      findFirst: jest.fn()
    }
  }
}));

describe('TrackController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;
  let mockSetHeader: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockSend = jest.fn();
    mockSetHeader = jest.fn();
    
    mockRequest = {
      body: {},
      params: {},
      user: undefined,
      file: undefined
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
      send: mockSend,
      setHeader: mockSetHeader
    };

    jest.clearAllMocks();
  });

  describe('createTrack', () => {
    it('deve criar uma track com sucesso', async () => {
      const mockFile = {
        originalname: 'test.mp3',
        mimetype: 'audio/mpeg',
        buffer: Buffer.from('test audio data'),
        size: 1024
      };

      const mockProject = {
        id: '1',
        ownerId: '1'
      };

      const mockTrack = {
        id: 't1',
        name: 'test',
        description: null,
        filePath: 'test.mp3',
        fileSize: 1024,
        mimeType: 'audio/mpeg',
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.body = { projectId: '1', name: 'test' };
      mockRequest.file = mockFile as any;

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.track.create as jest.Mock).mockResolvedValue(mockTrack);

      await createTrack(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Track criada com sucesso',
        track: expect.objectContaining({
          name: 'test'
        })
      });
    });

    it('deve retornar erro 400 se projectId não for fornecido', async () => {
      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.body = {};

      await createTrack(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'ID do projeto é obrigatório'
      });
    });

    it('deve retornar erro 400 se arquivo não for fornecido', async () => {
      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.body = { projectId: '1' };
      mockRequest.file = undefined;

      await createTrack(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Arquivo de áudio é obrigatório'
      });
    });

    it('deve retornar erro 403 se usuário não tiver permissão', async () => {
      const mockFile = {
        originalname: 'test.mp3',
        mimetype: 'audio/mpeg',
        buffer: Buffer.from('test'),
        size: 1024
      };

      mockRequest.user = { id: '2', email: 'user2@example.com', name: 'User 2' };
      mockRequest.body = { projectId: '1' };
      mockRequest.file = mockFile as any;

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

      await createTrack(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('getTrack', () => {
    it('deve retornar uma track específica', async () => {
      const mockTrack = {
        id: 't1',
        name: 'Test Track',
        description: null,
        filePath: 'test.mp3',
        fileSize: 1024,
        duration: 180,
        mimeType: 'audio/mpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: '1'
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: 't1' };

      (prisma.track.findFirst as jest.Mock).mockResolvedValue(mockTrack);

      await getTrack(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        track: mockTrack
      });
    });

    it('deve retornar erro 404 se track não for encontrada', async () => {
      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: 't999' };

      (prisma.track.findFirst as jest.Mock).mockResolvedValue(null);

      await getTrack(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Track não encontrada ou você não tem permissão para acessá-la'
      });
    });
  });

  describe('getProjectTracks', () => {
    it('deve retornar todas as tracks de um projeto', async () => {
      const mockProject = { id: '1', ownerId: '1' };
      const mockTracks = [
        {
          id: 't1',
          name: 'Track 1',
          description: null,
          filePath: 'track1.mp3',
          fileSize: 1024,
          duration: 180,
          mimeType: 'audio/mpeg',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 't2',
          name: 'Track 2',
          description: null,
          filePath: 'track2.mp3',
          fileSize: 2048,
          duration: 240,
          mimeType: 'audio/mpeg',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { projectId: '1' };

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);

      await getProjectTracks(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        tracks: mockTracks
      });
    });

    it('deve retornar erro 404 se projeto não for encontrado', async () => {
      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { projectId: '999' };

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

      await getProjectTracks(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para acessá-lo'
      });
    });
  });

  describe('updateTrack', () => {
    it('deve atualizar uma track com sucesso', async () => {
      const existingTrack = {
        id: 't1',
        name: 'Old Name',
        projectId: '1'
      };

      const updatedTrack = {
        id: 't1',
        name: 'New Name',
        description: 'Updated description',
        filePath: 'test.mp3',
        fileSize: 1024,
        duration: 180,
        mimeType: 'audio/mpeg',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: 't1' };
      mockRequest.body = { name: 'New Name', description: 'Updated description' };

      (prisma.track.findFirst as jest.Mock).mockResolvedValue(existingTrack);
      (prisma.track.update as jest.Mock).mockResolvedValue(updatedTrack);

      await updateTrack(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Track atualizada com sucesso',
        track: updatedTrack
      });
    });

    it('deve retornar erro 403 se usuário não tiver permissão', async () => {
      mockRequest.user = { id: '2', email: 'user2@example.com', name: 'User 2' };
      mockRequest.params = { id: 't1' };
      mockRequest.body = { name: 'New Name' };

      (prisma.track.findFirst as jest.Mock).mockResolvedValue(null);

      await updateTrack(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteTrack', () => {
    it('deve deletar uma track com sucesso', async () => {
      const existingTrack = {
        id: 't1',
        name: 'Test Track',
        projectId: '1'
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: 't1' };

      (prisma.track.findFirst as jest.Mock).mockResolvedValue(existingTrack);
      (prisma.track.delete as jest.Mock).mockResolvedValue({});

      await deleteTrack(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Track deletada com sucesso'
      });
    });

    it('deve retornar erro 403 se usuário não tiver permissão', async () => {
      mockRequest.user = { id: '2', email: 'user2@example.com', name: 'User 2' };
      mockRequest.params = { id: 't1' };

      (prisma.track.findFirst as jest.Mock).mockResolvedValue(null);

      await deleteTrack(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Track não encontrada')
      });
    });
  });

  describe('getTrackAudio', () => {
    it('deve retornar o áudio em base64', async () => {
      const mockAudioData = Buffer.from('test audio data');
      const mockTrack = {
        id: 't1',
        name: 'Test Track',
        mimeType: 'audio/mpeg',
        audioData: mockAudioData
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: 't1' };

      (prisma.track.findFirst as jest.Mock).mockResolvedValue(mockTrack);

      await getTrackAudio(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        audioUrl: expect.stringContaining('data:audio/mpeg;base64'),
        mimeType: 'audio/mpeg'
      });
    });

    it('deve retornar erro 404 se track não tiver audioData', async () => {
      const mockTrack = {
        id: 't1',
        name: 'Test Track',
        mimeType: 'audio/mpeg',
        audioData: null
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: 't1' };

      (prisma.track.findFirst as jest.Mock).mockResolvedValue(mockTrack);

      await getTrackAudio(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Track não encontrada ou não possui arquivo de áudio'
      });
    });
  });

  describe('downloadTrackAudio', () => {
    it('deve fazer download do áudio', async () => {
      const mockAudioData = Buffer.from('test audio data');
      const mockTrack = {
        id: 't1',
        name: 'Test Track',
        mimeType: 'audio/mpeg',
        audioData: mockAudioData,
        filePath: 'test.mp3'
      };

      mockRequest.user = { id: '1', email: 'user1@example.com', name: 'User 1' };
      mockRequest.params = { id: 't1' };

      (prisma.track.findFirst as jest.Mock).mockResolvedValue(mockTrack);

      await downloadTrackAudio(mockRequest as any, mockResponse as Response);

      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment'));
      expect(mockSend).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });
});

