import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

router.use(authenticateToken);
router.get('/', TemplateController.list);
router.post('/', requireRole(UserRole.ADMIN), TemplateController.create);
router.delete('/:id', requireRole(UserRole.ADMIN), TemplateController.delete);
router.post('/:id/apply', requireRole(UserRole.ADMIN), TemplateController.applyToCohort);

export default router;
