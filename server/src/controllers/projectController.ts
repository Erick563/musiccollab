import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';

// Interface para o estado do projeto
interface ProjectState {
  tracks: any[];
  markers: any[];
  bpm: number;
  masterVolume: number;
  zoom: number;
  currentTime?: number;
}

// Listar projetos do usuário
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const projects = await prisma.project.findMany({
      where: {
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
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        tracks: {
          where: {
            isActive: true
          }
        },
        _count: {
          select: {
            tracks: true,
            collaborators: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Formatar projetos para resposta
    const formattedProjects = projects.map(project => {
      const state = project.state as ProjectState | null;
      const duration = state && state.tracks && state.tracks.length > 0
        ? Math.max(...state.tracks.map((t: any) => (t.startTime || 0) + (t.duration || 0)))
        : 0;

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        isPublic: project.isPublic,
        status: project.status,
        duration,
        tracksCount: project._count.tracks,
        collaboratorsCount: project._count.collaborators,
        owner: project.owner,
        collaborators: project.collaborators.map(c => c.user),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      };
    });

    return res.json({
      success: true,
      projects: formattedProjects
    });
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter projeto por ID
export const getProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
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
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        tracks: {
          where: {
            isActive: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para acessá-lo'
      });
    }

    return res.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        isPublic: project.isPublic,
        status: project.status,
        state: project.state,
        owner: project.owner,
        collaborators: project.collaborators.map(c => c.user),
        tracks: project.tracks,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });
  } catch (error) {
    console.error('Erro ao obter projeto:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar novo projeto
export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { title, description, genre, isPublic, state } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Título do projeto é obrigatório'
      });
    }

    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        genre: genre?.trim() || null,
        isPublic: isPublic || false,
        status: 'DRAFT',
        state: state || null,
        ownerId: req.user.id
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Projeto criado com sucesso',
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        isPublic: project.isPublic,
        status: project.status,
        state: project.state,
        owner: project.owner,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar projeto
export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;
    const { title, description, genre, isPublic, status, state } = req.body;

    // Verificar se o projeto existe e se o usuário tem permissão
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
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
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para editá-lo'
      });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (genre !== undefined) updateData.genre = genre?.trim() || null;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (status !== undefined) updateData.status = status;
    if (state !== undefined) updateData.state = state;

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return res.json({
      success: true,
      message: 'Projeto atualizado com sucesso',
      project: {
        id: updatedProject.id,
        title: updatedProject.title,
        description: updatedProject.description,
        genre: updatedProject.genre,
        isPublic: updatedProject.isPublic,
        status: updatedProject.status,
        state: updatedProject.state,
        owner: updatedProject.owner,
        collaborators: updatedProject.collaborators.map(c => c.user),
        createdAt: updatedProject.createdAt,
        updatedAt: updatedProject.updatedAt
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar projeto
export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;

    // Verificar se o projeto existe e se o usuário é o dono
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        ownerId: req.user.id
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para deletá-lo'
      });
    }

    await prisma.project.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Projeto deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

