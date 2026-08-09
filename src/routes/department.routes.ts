import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

// Public read for dropdowns in profile/dashboard
router.get('/', DepartmentController.list);

// Admin create department
router.post('/', authenticateToken, requireRole(UserRole.ADMIN), DepartmentController.create);
router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), DepartmentController.update);
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), DepartmentController.delete);

export default router;
