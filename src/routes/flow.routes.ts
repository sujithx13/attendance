import { Router } from 'express';
import { FlowController } from '../controllers/flow.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

// Student dynamic flow retrieval
router.get('/student', authenticateToken, FlowController.getStudentFlow);

// Professor classroom display / projector flow retrieval
router.get('/professor', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), FlowController.getProfessorFlow);

// Dynamic policy modification
router.put('/sessions/:sessionId/policy', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), FlowController.updateSessionPolicy);

export default router;
