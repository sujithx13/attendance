import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();
router.get('/live-summary', authenticateToken, requireRole(UserRole.ADMIN), AnalyticsController.getLiveSummary);

// Student high-performance attendance percentage
router.get('/student/:studentId', authenticateToken, AnalyticsController.getStudentSummary);
router.get('/my-summary', authenticateToken, AnalyticsController.getStudentSummary);

// Session statistics
router.get('/session/:sessionId', authenticateToken, AnalyticsController.getSessionStats);

// Materialized view refresh
router.post('/refresh', authenticateToken, requireRole(UserRole.ADMIN, UserRole.PROFESSOR), AnalyticsController.refreshMaterializedViews);

// Anti-spoofing security violation log
router.get('/security-violations', authenticateToken, requireRole(UserRole.ADMIN, UserRole.PROFESSOR), AnalyticsController.getSecurityViolations);

export default router;
