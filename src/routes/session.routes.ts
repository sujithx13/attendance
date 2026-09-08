import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

router.get('/', authenticateToken, SessionController.listSessions);
router.get('/for-slot/:slotId', authenticateToken, SessionController.slotContext);
router.get('/:id', authenticateToken, SessionController.getSessionById);

router.post('/', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), SessionController.createSession);
router.post('/launch-slot', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), SessionController.launchSlotSession);
router.post('/:id/start', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), SessionController.startSession);
router.post('/:id/end', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), SessionController.endSession);

// Active QR & Exportable QR routes
router.get('/:id/qr-code', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), SessionController.getActiveQr);
router.get('/:id/qr-export', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), SessionController.exportQr);

export default router;
