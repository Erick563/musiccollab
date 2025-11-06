import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import multer from 'multer';

// Configurar multer para processar arquivos em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/flac',
      'audio/aac'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use apenas arquivos de áudio (MP3, WAV, OGG, M4A, FLAC, AAC)'));
    }
  }
});

// Middleware para upload de arquivo único
export const uploadMiddleware = upload.single('audio');

// Criar track com upload de áudio
export const createTrack = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { projectId, name, description, startTime, volume, pan, color } = req.body;
    const file = req.file;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'ID do projeto é obrigatório'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo de áudio é obrigatório'
      });
    }

    // Verificar se o projeto existe e se o usuário tem permissão
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: req.user.id },
          {
            collaborators: {
              some: {
                userId: req.user.id
              }
            }
          }
        ]
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para adicionar tracks'
      });
    }

    // Obter duração do áudio (será calculado no frontend ou aqui se necessário)
    // Por enquanto, vamos usar o tamanho do arquivo como referência
    const audioBuffer = Buffer.from(file.buffer);
    const fileSize = audioBuffer.length;

    // Criar track no banco de dados
    const track = await prisma.track.create({
      data: {
        name: name || file.originalname.replace(/\.[^/.]+$/, ''),
        description: description || null,
        filePath: file.originalname,
        fileSize: fileSize,
        mimeType: file.mimetype,
        audioData: audioBuffer, // Armazenar dados binários no PostgreSQL
        duration: null, // Será atualizado quando o áudio for processado
        projectId: projectId
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Track criada com sucesso',
      track: {
        id: track.id,
        name: track.name,
        description: track.description,
        filePath: track.filePath,
        fileSize: track.fileSize,
        duration: track.duration,
        mimeType: track.mimeType,
        createdAt: track.createdAt,
        updatedAt: track.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Erro ao criar track:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// Obter track por ID (sem dados de áudio)
export const getTrack = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;

    const track = await prisma.track.findFirst({
      where: {
        id,
        isActive: true,
        project: {
          OR: [
            { ownerId: req.user.id },
            {
              collaborators: {
                some: {
                  userId: req.user.id
                }
              }
            }
          ]
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        filePath: true,
        fileSize: true,
        duration: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        projectId: true
        // Não incluir audioData aqui para economizar banda
      }
    });

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track não encontrada ou você não tem permissão para acessá-la'
      });
    }

    return res.json({
      success: true,
      track
    });
  } catch (error) {
    console.error('Erro ao obter track:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Download do arquivo de áudio
export const downloadTrackAudio = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;

    const track = await prisma.track.findFirst({
      where: {
        id,
        isActive: true,
        project: {
          OR: [
            { ownerId: req.user.id },
            {
              collaborators: {
                some: {
                  userId: req.user.id
                }
              }
            }
          ]
        }
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        audioData: true,
        filePath: true
      }
    });

    if (!track || !(track as any).audioData) {
      return res.status(404).json({
        success: false,
        message: 'Track não encontrada ou não possui arquivo de áudio'
      });
    }

    // Converter Buffer para Buffer do Node.js
    const audioBuffer = Buffer.from((track as any).audioData);

    // Configurar headers para download
    res.setHeader('Content-Type', track.mimeType || 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${track.filePath || track.name}.mp3"`);
    res.setHeader('Content-Length', audioBuffer.length);

    return res.send(audioBuffer);
  } catch (error) {
    console.error('Erro ao fazer download do áudio:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter URL de áudio (retorna como base64 ou blob URL)
export const getTrackAudio = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;

    const track = await prisma.track.findFirst({
      where: {
        id,
        isActive: true,
        project: {
          OR: [
            { ownerId: req.user.id },
            {
              collaborators: {
                some: {
                  userId: req.user.id
                }
              }
            }
          ]
        }
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        audioData: true
      }
    });

    if (!track || !(track as any).audioData) {
      return res.status(404).json({
        success: false,
        message: 'Track não encontrada ou não possui arquivo de áudio'
      });
    }

    // Converter Buffer para base64
    const audioBuffer = Buffer.from((track as any).audioData);
    const base64Audio = audioBuffer.toString('base64');
    const dataUrl = `data:${track.mimeType || 'audio/mpeg'};base64,${base64Audio}`;

    return res.json({
      success: true,
      audioUrl: dataUrl,
      mimeType: track.mimeType
    });
  } catch (error) {
    console.error('Erro ao obter áudio:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar tracks de um projeto
export const getProjectTracks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { projectId } = req.params;

    // Verificar permissão
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: req.user.id },
          {
            collaborators: {
              some: {
                userId: req.user.id
              }
            }
          }
        ]
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para acessá-lo'
      });
    }

    const tracks = await prisma.track.findMany({
      where: {
        projectId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        filePath: true,
        fileSize: true,
        duration: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true
        // Não incluir audioData para economizar banda
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return res.json({
      success: true,
      tracks
    });
  } catch (error) {
    console.error('Erro ao listar tracks:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar track
export const updateTrack = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;
    const { name, description, duration } = req.body;

    // Verificar permissão
    const existingTrack = await prisma.track.findFirst({
      where: {
        id,
        isActive: true,
        project: {
          OR: [
            { ownerId: req.user.id },
            {
              collaborators: {
                some: {
                  userId: req.user.id,
                  role: {
                    in: ['OWNER', 'ADMIN']
                  }
                }
              }
            }
          ]
        }
      }
    });

    if (!existingTrack) {
      return res.status(404).json({
        success: false,
        message: 'Track não encontrada ou você não tem permissão para editá-la'
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (duration !== undefined) updateData.duration = Math.floor(duration);

    const updatedTrack = await prisma.track.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        filePath: true,
        fileSize: true,
        duration: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({
      success: true,
      message: 'Track atualizada com sucesso',
      track: updatedTrack
    });
  } catch (error) {
    console.error('Erro ao atualizar track:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar track (soft delete)
export const deleteTrack = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;

    // Verificar permissão
    const existingTrack = await prisma.track.findFirst({
      where: {
        id,
        isActive: true,
        project: {
          OR: [
            { ownerId: req.user.id },
            {
              collaborators: {
                some: {
                  userId: req.user.id,
                  role: {
                    in: ['OWNER', 'ADMIN']
                  }
                }
              }
            }
          ]
        }
      }
    });

    if (!existingTrack) {
      return res.status(404).json({
        success: false,
        message: 'Track não encontrada ou você não tem permissão para deletá-la'
      });
    }

    // Soft delete
    await prisma.track.update({
      where: { id },
      data: { isActive: false }
    });

    return res.json({
      success: true,
      message: 'Track deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar track:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

