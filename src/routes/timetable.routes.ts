import { Router } from 'express';
import { TimetableController } from '../controllers/timetable.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

// View timetable (students, professors, admins)
router.get('/', authenticateToken, TimetableController.list);

// Admin creates timetable slot
router.post('/slots', authenticateToken, requireRole(UserRole.ADMIN), TimetableController.createSlot);

// Admin deactivates timetable slot
router.delete('/slots/:id', authenticateToken, requireRole(UserRole.ADMIN), TimetableController.deleteSlot);

// Admin or Professor triggers automatic session generation for a date based on master timetable
router.post('/generate-sessions', authenticateToken, requireRole(UserRole.ADMIN, UserRole.PROFESSOR), TimetableController.generateSessions);

export default router;
