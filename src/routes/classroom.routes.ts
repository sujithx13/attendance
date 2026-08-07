import { Router } from 'express';
import { ClassroomController } from '../controllers/classroom.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

router.get('/', authenticateToken, ClassroomController.listClassrooms);
router.get('/:id', authenticateToken, ClassroomController.getClassroomById);

router.post('/', authenticateToken, requireRole(UserRole.ADMIN), ClassroomController.createClassroom);
router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), ClassroomController.updateClassroom);

export default router;
