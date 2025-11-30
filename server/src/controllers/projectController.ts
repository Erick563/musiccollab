import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';

interface ProjectState {
  tracks: any[];
  masterVolume: number;
  zoom: number;
  currentTime?: number;
}

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
            name: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        tracks: true,
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

    const formattedProjects = projects.map(project => {
      const state = project.state as ProjectState | null;
      const duration = state && state.tracks && state.tracks.length > 0
        ? Math.max(...state.tracks.map((t: any) => (t.startTime || 0) + (t.duration || 0)))
        : 0;

      return {
        id: project.id,
        title: project.title,
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
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

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
            name: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        tracks: true
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para acessá-lo'
      });
    }

    // Determinar a role do usuário atual no projeto
    let currentUserRole = 'VIEWER';
    if (project.ownerId === req.user!.id) {
      currentUserRole = 'OWNER';
    } else {
      const userCollaborator = project.collaborators.find(c => c.userId === req.user!.id);
      if (userCollaborator) {
        currentUserRole = userCollaborator.role;
      }
    }

    return res.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        state: project.state,
        owner: project.owner,
        collaborators: project.collaborators.map(c => ({
          id: c.id,
          role: c.role,
          user: c.user
        })),
        tracks: project.tracks,
        currentUserRole: currentUserRole,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { title, state } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Título do projeto é obrigatório'
      });
    }

    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        status: 'DRAFT',
        state: state || null,
        ownerId: req.user.id,
        // Adicionar o criador automaticamente como colaborador OWNER
        collaborators: {
          create: {
            userId: req.user.id,
            role: 'OWNER'
          }
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
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
        status: project.status,
        state: project.state,
        owner: project.owner,
        collaborators: project.collaborators.map(c => ({
          id: c.id,
          role: c.role,
          user: c.user
        })),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;
    const { title, status, state } = req.body;

    // Buscar projeto e verificar permissões
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
                  in: ['OWNER', 'ADMIN', 'COLLABORATOR']
                }
              }
            }
          }
        ]
      },
      include: {
        collaborators: {
          where: {
            userId: req.user.id
          }
        }
      }
    });

    if (!existingProject) {
      return res.status(403).json({
        success: false,
        message: 'Projeto não encontrado ou você não tem permissão para editá-lo. Usuários com permissão de visualização não podem fazer modificações.'
      });
    }

    // Determinar role do usuário
    let userRole = 'VIEWER';
    if (existingProject.ownerId === req.user.id) {
      userRole = 'OWNER';
    } else if (existingProject.collaborators.length > 0) {
      userRole = existingProject.collaborators[0].role;
    }

    // Validar permissões específicas
    const updateData: any = {};
    
    // Apenas OWNER e ADMIN podem editar título e status
    if (title !== undefined || status !== undefined) {
      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Apenas proprietários e administradores podem editar informações do projeto (título e status).'
        });
      }
      if (title !== undefined) updateData.title = title.trim();
      if (status !== undefined) updateData.status = status;
    }
    
    // Colaboradores podem editar o estado (tracks, volumes, etc.)
    if (state !== undefined) updateData.state = state;

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true
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
        status: updatedProject.status,
        state: updatedProject.state,
        owner: updatedProject.owner,
        collaborators: updatedProject.collaborators.map(c => c.user),
        createdAt: updatedProject.createdAt,
        updatedAt: updatedProject.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { id } = req.params;

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
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Colaboradores

export const getCollaborators = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { projectId } = req.params;

    // Verificar se o usuário tem acesso ao projeto
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

    const collaborators = await prisma.projectCollaborator.findMany({
      where: {
        projectId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.json({
      success: true,
      collaborators: collaborators.map(c => ({
        id: c.id,
        role: c.role,
        joinedAt: c.joinedAt,
        user: c.user
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const addCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { projectId } = req.params;
    const { userEmail, role = 'COLLABORATOR' } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email do usuário é obrigatório'
      });
    }

    // Verificar se o usuário atual é o dono ou admin do projeto
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
                  in: ['OWNER', 'ADMIN']
                }
              }
            }
          }
        ]
      }
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para adicionar colaboradores a este projeto'
      });
    }

    // Buscar o usuário a ser adicionado
    const userToAdd = await prisma.user.findUnique({
      where: {
        email: userEmail
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se o usuário já é colaborador
    const existingCollaborator = await prisma.projectCollaborator.findUnique({
      where: {
        userId_projectId: {
          userId: userToAdd.id,
          projectId
        }
      }
    });

    if (existingCollaborator) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já é colaborador deste projeto'
      });
    }

    // Verificar se o usuário é o dono
    if (project.ownerId === userToAdd.id) {
      return res.status(400).json({
        success: false,
        message: 'O dono do projeto já tem acesso total'
      });
    }

    // Adicionar colaborador
    const collaborator = await prisma.projectCollaborator.create({
      data: {
        userId: userToAdd.id,
        projectId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Colaborador adicionado com sucesso',
      collaborator: {
        id: collaborator.id,
        role: collaborator.role,
        joinedAt: collaborator.joinedAt,
        user: collaborator.user
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const updateCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { projectId, collaboratorId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role é obrigatório'
      });
    }

    // Verificar se o usuário atual é o dono ou admin do projeto
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
                  in: ['OWNER', 'ADMIN']
                }
              }
            }
          }
        ]
      }
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para atualizar colaboradores deste projeto'
      });
    }

    // Verificar se o colaborador a ser atualizado é o proprietário
    const collaboratorToUpdate = await prisma.projectCollaborator.findUnique({
      where: {
        id: collaboratorId
      }
    });

    if (!collaboratorToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Colaborador não encontrado'
      });
    }

    // Não permitir alterar a role do proprietário
    if (collaboratorToUpdate.userId === project.ownerId) {
      return res.status(403).json({
        success: false,
        message: 'Não é possível alterar as permissões do proprietário do projeto'
      });
    }

    // Atualizar colaborador
    const collaborator = await prisma.projectCollaborator.update({
      where: {
        id: collaboratorId
      },
      data: {
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.json({
      success: true,
      message: 'Colaborador atualizado com sucesso',
      collaborator: {
        id: collaborator.id,
        role: collaborator.role,
        joinedAt: collaborator.joinedAt,
        user: collaborator.user
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const removeCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const { projectId, collaboratorId } = req.params;

    // Verificar se o usuário atual é o dono ou admin do projeto
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
                  in: ['OWNER', 'ADMIN']
                }
              }
            }
          }
        ]
      }
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para remover colaboradores deste projeto'
      });
    }

    // Verificar se o colaborador a ser removido é o proprietário
    const collaboratorToRemove = await prisma.projectCollaborator.findUnique({
      where: {
        id: collaboratorId
      }
    });

    if (!collaboratorToRemove) {
      return res.status(404).json({
        success: false,
        message: 'Colaborador não encontrado'
      });
    }

    // Não permitir remover o proprietário
    if (collaboratorToRemove.userId === project.ownerId) {
      return res.status(403).json({
        success: false,
        message: 'Não é possível remover o proprietário do projeto'
      });
    }

    // Remover colaborador
    await prisma.projectCollaborator.delete({
      where: {
        id: collaboratorId
      }
    });

    return res.json({
      success: true,
      message: 'Colaborador removido com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

