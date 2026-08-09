import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

router.get('/', authenticateToken, SessionController.listSessions);
router.get('/:id', authenticateToken, SessionController.getSessionById);

router.post('/', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), SessionController.createSession);
router.post('/:id/start', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), SessionController.startSession);
router.post('/:id/end', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), SessionController.endSession);

// Active QR & Exportable QR routes
router.get('/:id/qr-code', authenticateToken, SessionController.getActiveQr);
router.get('/:id/qr-export', authenticateToken, SessionController.exportQr);

export default router;
