import { Router } from 'express';
import { BatchController } from '../controllers/batch.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

// List all batches (filtered by dept or prof)
router.get('/', authenticateToken, BatchController.list);

// Get batch details with member list
router.get('/:id', authenticateToken, BatchController.getById);

// Get members of a batch
router.get('/:id/members', authenticateToken, BatchController.getMembers);

// Admin creates a batch
router.post('/', authenticateToken, requireRole(UserRole.ADMIN), BatchController.create);

// Admin or Professor manages batch faculty/teachers
router.get('/:id/professors', authenticateToken, BatchController.getProfessors);
router.post('/:id/professors', authenticateToken, requireRole(UserRole.ADMIN, UserRole.PROFESSOR), BatchController.addProfessor);
router.delete('/:id/professors/:professorId', authenticateToken, requireRole(UserRole.ADMIN, UserRole.PROFESSOR), BatchController.removeProfessor);

// Admin or Professor enrolls a student into a batch
router.post('/:id/students', authenticateToken, requireRole(UserRole.ADMIN, UserRole.PROFESSOR), BatchController.addStudent);
router.delete('/:id/students/:studentId', authenticateToken, requireRole(UserRole.ADMIN, UserRole.PROFESSOR), BatchController.removeStudent);

// Admin updates or deletes a batch
router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), BatchController.update);
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), BatchController.delete);

export default router;
