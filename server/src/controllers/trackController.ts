import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import multer, { FileFilterCallback } from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB (reduzido de 50MB para evitar out of memory no Render free plan)
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
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

export const uploadMiddleware = upload.single('audio');

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

    // Log de início do upload para debug
    console.log(`[Upload] Iniciando upload de ${file.originalname} (${(file.buffer.length / 1024 / 1024).toFixed(2)}MB) para o projeto ${projectId}`);

    // Verificar se o usuário tem permissão para adicionar tracks (não pode ser VIEWER)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: req.user.id },
          {
            collaborators: {
              some: {
                userId: req.user.id,
                role: {
                  not: 'VIEWER'
                }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        ownerId: true
      }
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para adicionar tracks. Usuários com permissão de visualização não podem fazer modificações.'
      });
    }

    // Processar buffer de forma mais eficiente
    const fileSize = file.buffer.length;
    
    console.log(`[Upload] Salvando track no banco de dados...`);
    
    const track = await prisma.track.create({
      data: {
        name: name || file.originalname.replace(/\.[^/.]+$/, ''),
        description: description || null,
        filePath: file.originalname,
        fileSize: fileSize,
        mimeType: file.mimetype,
        audioData: file.buffer, // Usar diretamente o buffer sem conversão
        duration: null,
        projectId: projectId
      }
    });

    console.log(`[Upload] Track ${track.id} criada com sucesso!`);

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
    console.error('[Upload] Erro ao criar track:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

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
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

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
        filePath: true,
        fileSize: true
      }
    });

    if (!track || !(track as any).audioData) {
      return res.status(404).json({
        success: false,
        message: 'Track não encontrada ou não possui arquivo de áudio'
      });
    }

    const audioBuffer = Buffer.from((track as any).audioData);

    res.setHeader('Content-Type', track.mimeType || 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${track.filePath || track.name}.mp3"`);
    res.setHeader('Content-Length', track.fileSize || audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return res.end(audioBuffer);
  } catch (error) {
    console.error('[Download Track] Erro ao baixar áudio:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    // Forçar garbage collection após download
    if (global.gc) {
      global.gc();
    }
  }
};

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
        fileSize: true
      }
    });

    if (!track || !(track as any).audioData) {
      return res.status(404).json({
        success: false,
        message: 'Track não encontrada ou não possui arquivo de áudio'
      });
    }

    // SOLUÇÃO 1: Streaming em vez de base64 (reduz uso de memória em ~60%)
    const audioBuffer = Buffer.from((track as any).audioData);
    
    // Configurar headers para streaming
    res.setHeader('Content-Type', track.mimeType || 'audio/mpeg');
    res.setHeader('Content-Length', track.fileSize || audioBuffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Suportar Range requests para melhor performance
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : audioBuffer.length - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206); // Partial Content
      res.setHeader('Content-Range', `bytes ${start}-${end}/${audioBuffer.length}`);
      res.setHeader('Content-Length', chunksize);
      
      return res.end(audioBuffer.slice(start, end + 1));
    }
    
    // Enviar stream completo
    res.status(200);
    return res.end(audioBuffer);
  } catch (error) {
    console.error('[Track Audio] Erro ao buscar áudio:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    // SOLUÇÃO 2: Forçar garbage collection após envio (Node.js ≥ 14)
    if (global.gc) {
      global.gc();
    }
  }
};

export const getProjectTracks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { projectId } = req.params;

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
        projectId
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
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

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

    const existingTrack = await prisma.track.findFirst({
      where: {
        id,
        project: {
          OR: [
            { ownerId: req.user.id },
            {
              collaborators: {
                some: {
                  userId: req.user.id,
                  role: {
                    in: ['OWNER', 'ADMIN', 'COLLABORATOR']
                  }
                }
              }
            }
          ]
        }
      }
    });

    if (!existingTrack) {
      return res.status(403).json({
        success: false,
        message: 'Track não encontrada ou você não tem permissão para editá-la. Usuários com permissão de visualização não podem fazer modificações.'
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
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const deleteTrack = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;

    const existingTrack = await prisma.track.findFirst({
      where: {
        id,
        project: {
          OR: [
            { ownerId: req.user.id },
            {
              collaborators: {
                some: {
                  userId: req.user.id,
                  role: {
                    in: ['OWNER', 'ADMIN', 'COLLABORATOR']
                  }
                }
              }
            }
          ]
        }
      }
    });

    if (!existingTrack) {
      return res.status(403).json({
        success: false,
        message: 'Track não encontrada ou você não tem permissão para deletá-la. Usuários com permissão de visualização não podem fazer modificações.'
      });
    }

    await prisma.track.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Track deletada com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

