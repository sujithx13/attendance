import { Router } from 'express';
import { AnnouncementController } from '../controllers/announcement.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Public / Authenticated list
router.get('/', AnnouncementController.list);

// Authenticated creation / deletion
router.post('/', authenticateToken, AnnouncementController.create);
router.delete('/:id', authenticateToken, AnnouncementController.delete);

export default router;
