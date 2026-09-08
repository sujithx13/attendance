import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getDb } from '../database/db.js';
import { SessionStatus } from '../config/constants.js';
import { QrService } from '../services/qr.service.js';
import { refreshMaterializedViews } from '../database/materialized-views.js';
import { UserRole } from '../config/constants.js';
import { requireSessionAccess, professorScope, httpError } from '../services/access.service.js';
import { withTransaction } from '../database/db.js';
import { setSessionOrigin, validateSessionLocation } from '../services/session-location.service.js';
import { SessionContextService } from '../services/session-context.service.js';

export class SessionController {
  static async slotContext(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json(await SessionContextService.forSlot(req.user!, String(req.params.slotId)));
  }
  static async listSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = await getDb();
    const status = req.query.status as string;
    const courseId = req.query.courseId as string;

    let query = `
      SELECT s.*, c.code AS course_code, c.name AS course_name,
             u.full_name AS professor_name, clr.name AS classroom_name, clr.building,
             clr.latitude, clr.longitude, clr.radius_meters
      FROM sessions s
      LEFT JOIN courses c ON s.course_id = c.id
      JOIN users u ON s.professor_id = u.id
      JOIN classrooms clr ON s.classroom_id = clr.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (req.user!.role === UserRole.PROFESSOR) {
      params.push(req.user!.userId);
      query += ` AND ${professorScope('s', '$1')}`;
    } else if (req.user!.role === UserRole.STUDENT) {
      params.push(req.user!.userId);
      query += ` AND (EXISTS (SELECT 1 FROM batch_members bm WHERE bm.batch_id = s.batch_id AND bm.student_id = $1)
        OR (s.batch_id IS NULL AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = s.course_id AND e.student_id = $1 AND e.status = 'ACTIVE')))`;
    }

    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }

    if (courseId) {
      params.push(courseId);
      query += ` AND s.course_id = $${params.length}`;
    }

    query += ` ORDER BY s.start_time DESC`;

    const result = await db.query(query, params);
    res.status(200).json({ sessions: result.rows });
  }

  static async getSessionById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();
    await requireSessionAccess(req.user!, id);

    const result = await db.query(
      `SELECT s.*, c.code AS course_code, c.name AS course_name,
              u.full_name AS professor_name, clr.name AS classroom_name, clr.building,
              clr.latitude, clr.longitude, clr.radius_meters, clr.allowed_ip_subnets, clr.ble_beacon_ids
       FROM sessions s
       LEFT JOIN courses c ON s.course_id = c.id
       JOIN users u ON s.professor_id = u.id
       JOIN classrooms clr ON s.classroom_id = clr.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }

    res.status(200).json({ session: result.rows[0] });
  }

  static async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { courseId, classroomId, startTime, endTime, policyOverride } = req.body;
    const professorId = req.body.professorId || req.user?.userId;
    if (req.user!.role !== UserRole.ADMIN && professorId !== req.user!.userId) throw httpError(403, 'Cannot create a session for another professor.');

    if (!courseId || !classroomId || !startTime || !endTime) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'courseId, classroomId, startTime, and endTime are required.' });
      return;
    }

    const db = await getDb();
    const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.query(
      `INSERT INTO sessions (id, course_id, professor_id, classroom_id, start_time, end_time, status, verification_policy_override)
       VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED', $7)`,
      [id, courseId, professorId, classroomId, new Date(startTime), new Date(endTime), policyOverride ? JSON.stringify(policyOverride) : null]
    );

    res.status(201).json({ id, message: 'Session created successfully.' });
  }

  static async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();
    await requireSessionAccess(req.user!, id, true);

    await db.query(
      `UPDATE sessions SET status = 'ACTIVE' WHERE id = $1`,
      [id]
    );

    res.status(200).json({ success: true, message: `Session ${id} is now ACTIVE.` });
  }

  static async endSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();
    await requireSessionAccess(req.user!, id, true);

    await db.query(
      `UPDATE sessions SET status = 'COMPLETED' WHERE id = $1`,
      [id]
    );

    // Refresh materialized views in the background
    refreshMaterializedViews(false).catch((err) => {
      console.warn('[Analytics] Background view refresh failed:', err.message);
    });

    res.status(200).json({ success: true, message: `Session ${id} is COMPLETED.` });
  }

  static async launchSlotSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await withTransaction(() => SessionController.launchSlotInTransaction(req));
    res.status(result.statusCode).json(result.payload);
  }

  private static async launchSlotInTransaction(req: AuthenticatedRequest): Promise<{ statusCode: number; payload: { sessionId: string; status: string; message: string } }> {
    const { slotId, batchId, location } = req.body;
    if (location !== undefined) validateSessionLocation(location);
    const professorId = req.user?.userId;
    const db = await getDb();

    let resolvedBatchId = batchId;
    let resolvedRoomId = 'clr_turing_hall';
    let courseId: string | null = null;

    if (slotId) {
      const slotRes = await db.query('SELECT * FROM timetable_slots WHERE id = $1 FOR UPDATE', [slotId]);
      if (!slotRes.rows.length) throw httpError(404, 'Timetable slot not found.');
      if (slotRes.rows.length > 0) {
        const slot = slotRes.rows[0];
        if (batchId && batchId !== slot.batch_id) throw httpError(400, 'Batch does not match timetable slot.');
        if (req.user!.role !== UserRole.ADMIN && slot.professor_id !== professorId) throw httpError(403, 'Only the assigned professor can launch this slot.');
        courseId = slot.course_id;
        const existing = await db.query("SELECT id FROM sessions WHERE timetable_slot_id = $1 AND status = 'ACTIVE' AND end_time > CURRENT_TIMESTAMP ORDER BY start_time DESC LIMIT 1", [slotId]);
        if (existing.rows[0]) {
          if (location !== undefined) await setSessionOrigin(existing.rows[0].id, location);
          return { statusCode: 200, payload: { sessionId: existing.rows[0].id, status: 'ACTIVE', message: 'Existing session is active.' } };
        }
        if (!resolvedBatchId) resolvedBatchId = slotRes.rows[0].batch_id;
        if (slotRes.rows[0].classroom_id) resolvedRoomId = slotRes.rows[0].classroom_id;
      }
    }
    if (!slotId) throw httpError(400, 'A timetable slot is required.');

    const roomRes = await db.query('SELECT id FROM classrooms LIMIT 1');
    if (roomRes.rows.length > 0 && (!resolvedRoomId || resolvedRoomId === 'clr_turing_hall')) {
      resolvedRoomId = roomRes.rows[0].id;
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date();
    const ends = new Date(now.getTime() + 120 * 60 * 1000); // 2 hours active

    await db.query(
      `INSERT INTO sessions (id, batch_id, professor_id, classroom_id, start_time, end_time, status, course_id, timetable_slot_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8)`,
      [sessionId, resolvedBatchId || null, professorId, resolvedRoomId, now, ends, courseId, slotId]
    );

    if (location !== undefined) await setSessionOrigin(sessionId, location);
    return { statusCode: 201, payload: {
      message: 'Live attendance session activated!',
      sessionId,
      status: 'ACTIVE'
    } };
  }

  /**
   * Generates exportable QR code (PNG, SVG, or Data URL) with custom expiration window.
   */
  static async exportQr(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const format = (req.query.format as 'png' | 'svg' | 'dataUrl') || 'dataUrl';
    const expiresInSeconds = parseInt(req.query.expiresInSeconds as string || '300', 10);
    const session = await requireSessionAccess(req.user!, id, true);
    if (session.status !== 'ACTIVE' || new Date(session.end_time) <= new Date()) throw httpError(409, 'Session is not active.');
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 900) throw httpError(400, 'QR expiration must be between 1 and 900 seconds.');

    const db = await getDb();
    const sessionRes = await db.query('SELECT id, status FROM sessions WHERE id = $1', [id]);

    if (sessionRes.rows.length === 0) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }

    const { payload, tokenObj } = QrService.generateSessionBroadcastPayload(id, expiresInSeconds, true);
    const rendered = await QrService.renderQrCode(payload, format);

    if (format === 'png') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="session-${id}-qr.png"`);
      res.send(rendered);
    } else if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(rendered);
    } else {
      res.status(200).json({
        sessionId: id,
        qrPayload: payload,
        dataUrl: rendered,
        expiresAt: tokenObj.exp,
        expiresInSeconds,
        timestamp: tokenObj.timestamp
      });
    }
  }

  /**
   * Returns current active QR code payload for a session.
   */
  static async getActiveQr(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const session = await requireSessionAccess(req.user!, id, true);
    if (session.status !== 'ACTIVE' || new Date(session.end_time) <= new Date()) throw httpError(409, 'Session is not active.');
    const { payload, tokenObj } = QrService.generateSessionBroadcastPayload(id);
    const dataUrl = await QrService.renderQrCode(payload, 'dataUrl');

    res.status(200).json({
      sessionId: id,
      qrPayload: payload,
      dataUrl,
      timestamp: tokenObj.timestamp,
      expiresAt: tokenObj.exp,
      expiresInSeconds: tokenObj.exp - tokenObj.timestamp
    });
  }
}
