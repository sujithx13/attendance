import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { getDb } from '../database/db.js';
import { UserRole } from '../config/constants.js';
import { httpError, professorScope, requireSessionAccess } from '../services/access.service.js';

export class AnalyticsController {
  static async getStudentSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const rawId = req.params.studentId || req.user?.userId;
    const studentId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!studentId) {
      res.status(400).json({ error: 'MISSING_STUDENT_ID' });
      return;
    }
    if (req.user!.role !== UserRole.ADMIN && studentId !== req.user!.userId) throw httpError(403, 'Only your own summary is available.');

    try {
      const summaries = await AnalyticsService.getStudentAttendanceSummary(studentId);
      res.status(200).json({ summaries });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: 'ANALYTICS_ERROR', message: err.message });
    }
  }

  static async getSessionStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const rawSessionId = req.params.sessionId;
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

    if (!sessionId) {
      res.status(400).json({ error: 'MISSING_SESSION_ID' });
      return;
    }

    try {
      await requireSessionAccess(req.user!, sessionId, true);
      const stats = await AnalyticsService.getSessionStats(sessionId);
      res.status(200).json({ stats });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: 'ANALYTICS_ERROR', message: err.message });
    }
  }

  static async refreshMaterializedViews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await AnalyticsService.refreshViews();
      res.status(200).json({ success: true, message: 'Materialized views refreshed concurrently.' });
    } catch (err: any) {
      res.status(500).json({ error: 'REFRESH_FAILED', message: err.message });
    }
  }

  static async getSecurityViolations(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = await getDb();
    const scoped = req.user!.role === UserRole.PROFESSOR;
    const result = await db.query(
      `SELECT sv.id,
              sv.student_id AS "studentId", sv.student_id,
              sv.violation_type AS "violationType", sv.violation_type,
              sv.severity, sv.details,
              sv.created_at AS "createdAt", sv.created_at,
              u.full_name AS "studentName", u.full_name AS student_name,
              u.email AS student_email,
              u.enrollment_id AS "enrollmentId", u.enrollment_id
       FROM security_violations sv
       LEFT JOIN users u ON sv.student_id = u.id
       ${scoped ? `WHERE EXISTS (SELECT 1 FROM sessions s WHERE s.id = sv.session_id AND ${professorScope('s', '$1')})` : ''}
       ORDER BY sv.created_at DESC LIMIT 100`, scoped ? [req.user!.userId] : []
    );

    res.status(200).json({ violations: result.rows });
  }

  static async getLiveSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = await getDb();
    const result = await db.query(`SELECT
      (SELECT COUNT(*)::int FROM sessions WHERE status = 'ACTIVE' AND end_time > CURRENT_TIMESTAMP) AS "activeSessions",
      (SELECT COUNT(*)::int FROM attendance_records WHERE status IN ('PRESENT','LATE') AND created_at >= CURRENT_DATE) AS "checkInsToday"`);
    res.json(result.rows[0]);
  }
}
