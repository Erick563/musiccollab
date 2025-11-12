import { Router } from 'express';
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
} from '../controllers/projectController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Rotas de projetos
router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Rotas de colaboradores
router.get('/:projectId/collaborators', getCollaborators);
router.post('/:projectId/collaborators', addCollaborator);
router.put('/:projectId/collaborators/:collaboratorId', updateCollaborator);
router.delete('/:projectId/collaborators/:collaboratorId', removeCollaborator);

export default router;

