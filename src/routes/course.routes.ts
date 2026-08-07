import { Router } from 'express';
import { CourseController } from '../controllers/course.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

// Public / Authenticated read
router.get('/', CourseController.list);
router.get('/:id/students', CourseController.getStudents);

// Admin / Professor mutations
router.post('/', authenticateToken, requireRole(UserRole.ADMIN), CourseController.create);
router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), CourseController.update);
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), CourseController.delete);
router.post('/:id/students', authenticateToken, CourseController.enrollStudent);
router.delete('/:id/students/:studentId', authenticateToken, CourseController.removeStudent);

export default router;
