import { Request, Response } from 'express';
import { getDb } from '../database/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AnnouncementController {
  static async list(req: Request, res: Response): Promise<void> {
    const { scopeType, scopeId } = req.query;
    const db = await getDb();

    let query = `SELECT * FROM announcements WHERE 1=1`;
    const params: any[] = [];

    if (scopeType) {
      params.push(scopeType);
      query += ` AND (scope_type = $${params.length} OR scope_type = 'CAMPUS')`;
    }

    if (scopeId) {
      params.push(scopeId);
      query += ` AND (scope_id = $${params.length} OR scope_id IS NULL)`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await db.query(query, params);
    res.json({ announcements: result.rows });
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { title, content, priority, scopeType, scopeId } = req.body;

    if (!title || !content || !scopeType) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'Title, content, and scopeType are required.' });
      return;
    }

    const db = await getDb();
    const id = `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const authorName = req.user?.fullName || 'Campus Administration';

    await db.query(
      `INSERT INTO announcements (id, title, content, priority, scope_type, scope_id, author_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, title.trim(), content.trim(), priority || 'GENERAL', scopeType, scopeId || null, authorName]
    );

    res.status(201).json({ message: 'Announcement published successfully.', announcementId: id });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();

    await db.query('DELETE FROM announcements WHERE id = $1', [id]);
    res.json({ message: 'Announcement removed successfully.' });
  }
}
