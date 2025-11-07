import { Router } from 'express';
import {
  createTrack,
  getTrack,
  downloadTrackAudio,
  getTrackAudio,
  getProjectTracks,
  updateTrack,
  deleteTrack,
  uploadMiddleware
} from '../controllers/trackController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', uploadMiddleware, createTrack);
router.get('/project/:projectId', getProjectTracks);
router.get('/:id', getTrack);
router.get('/:id/audio', getTrackAudio);
router.get('/:id/download', downloadTrackAudio);
router.put('/:id', updateTrack);
router.delete('/:id', deleteTrack);

export default router;

