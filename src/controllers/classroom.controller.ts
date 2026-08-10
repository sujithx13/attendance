import { Request, Response } from 'express';
import { getDb } from '../database/db.js';

export class ClassroomController {
  static async listClassrooms(req: Request, res: Response): Promise<void> {
    const db = await getDb();
    const result = await db.query('SELECT * FROM classrooms ORDER BY building, name');
    res.status(200).json({ classrooms: result.rows });
  }

  static async getClassroomById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const db = await getDb();
    const result = await db.query('SELECT * FROM classrooms WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'CLASSROOM_NOT_FOUND' });
      return;
    }

    res.status(200).json({ classroom: result.rows[0] });
  }

  static async createClassroom(req: Request, res: Response): Promise<void> {
    const { name, building, latitude, longitude, radiusMeters, wifiBssids, bleBeacons, allowedSubnets } = req.body;

    if (!name || !building || typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name, building, latitude, and longitude are required.' });
      return;
    }

    const db = await getDb();
    const id = `clr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.query(
      `INSERT INTO classrooms (id, name, building, latitude, longitude, radius_meters, wifi_bssid_whitelist, ble_beacon_ids, allowed_ip_subnets)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, name, building, latitude, longitude, radiusMeters || 25.0, wifiBssids || null, bleBeacons || null, allowedSubnets || null]
    );

    res.status(201).json({ id, message: 'Classroom created successfully.' });
  }

  static async updateClassroom(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, building, latitude, longitude, radiusMeters, allowedSubnets } = req.body;
    const db = await getDb();

    await db.query(
      `UPDATE classrooms
       SET name = COALESCE($1, name),
           building = COALESCE($2, building),
           latitude = COALESCE($3, latitude),
           longitude = COALESCE($4, longitude),
           radius_meters = COALESCE($5, radius_meters),
           allowed_ip_subnets = COALESCE($6, allowed_ip_subnets)
       WHERE id = $7`,
      [name, building, latitude, longitude, radiusMeters, allowedSubnets, id]
    );

    res.status(200).json({ success: true, message: 'Classroom updated successfully.' });
  }
}
