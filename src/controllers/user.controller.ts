import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../database/db.js';

export class UserController {
  static async list(req: Request, res: Response): Promise<void> {
    const { role, departmentId, yearOfStudy, search } = req.query;
    const db = await getDb();

    let query = `
      SELECT u.id, u.email, u.role,
             u.full_name AS "fullName", u.full_name,
             u.enrollment_id AS "enrollmentId", u.enrollment_id,
             u.photo_url AS "photoUrl",
             u.department_id AS "departmentId", u.department_id,
             u.year_of_study AS "yearOfStudy", u.year_of_study,
             u.created_at AS "createdAt",
             d.code AS "departmentCode", d.code AS department_code,
             d.name AS "departmentName", d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    if (departmentId) {
      params.push(departmentId);
      query += ` AND u.department_id = $${params.length}`;
    }

    if (yearOfStudy) {
      params.push(Number(yearOfStudy));
      query += ` AND u.year_of_study = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.enrollment_id ILIKE $${params.length})`;
    }

    query += ` ORDER BY u.role, u.full_name ASC`;

    const result = await db.query(query, params);
    res.json({ users: result.rows });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const { email, password, role, fullName, enrollmentId, departmentId, yearOfStudy } = req.body;

    if (!email || !password || !role || !fullName) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'Email, password, role, and fullName are required.' });
      return;
    }

    const db = await getDb();
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'EMAIL_IN_USE', message: 'A user with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${role.toLowerCase()}_${Date.now().toString(36)}`;

    await db.query(
      `INSERT INTO users (id, email, password_hash, role, full_name, enrollment_id, department_id, year_of_study)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        email.toLowerCase().trim(),
        passwordHash,
        role,
        fullName.trim(),
        enrollmentId?.trim() || null,
        departmentId || null,
        yearOfStudy ? Number(yearOfStudy) : null
      ]
    );

    const created = await db.query(
      `SELECT u.id, u.email, u.role, u.full_name AS "fullName", u.enrollment_id AS "enrollmentId",
              u.department_id AS "departmentId", u.year_of_study AS "yearOfStudy",
              d.code AS "departmentCode", d.name AS "departmentName"
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [userId]
    );

    res.status(201).json({ message: 'User created successfully.', user: created.rows[0] });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const { fullName, email, departmentId, yearOfStudy, role, enrollmentId } = req.body;
    const db = await getDb();

    const existing = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User does not exist.' });
      return;
    }

    await db.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           department_id = COALESCE($3, department_id),
           year_of_study = COALESCE($4, year_of_study),
           role = COALESCE($5, role),
           enrollment_id = COALESCE($6, enrollment_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        fullName || null,
        email ? email.toLowerCase().trim() : null,
        departmentId || null,
        yearOfStudy ? Number(yearOfStudy) : null,
        role || null,
        enrollmentId || null,
        id
      ]
    );

    const updated = await db.query(
      `SELECT u.id, u.email, u.role, u.full_name AS "fullName", u.enrollment_id AS "enrollmentId",
              u.department_id AS "departmentId", u.year_of_study AS "yearOfStudy",
              d.code AS "departmentCode", d.name AS "departmentName"
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [id]
    );

    res.json({ message: 'User updated successfully.', user: updated.rows[0] });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();

    // Prevent deleting primary admin
    if (id === 'usr_admin_main' || id.includes('admin')) {
      const check = await db.query('SELECT email FROM users WHERE id = $1', [id]);
      if (check.rows[0]?.email === 'admin@university.edu') {
        res.status(403).json({ error: 'CANNOT_DELETE_PRIMARY_ADMIN', message: 'The primary system admin cannot be deleted.' });
        return;
      }
    }

    await db.query('DELETE FROM batch_members WHERE student_id = $1', [id]);
    await db.query('DELETE FROM enrollments WHERE student_id = $1', [id]);
    await db.query('DELETE FROM attendance_records WHERE student_id = $1', [id]);
    await db.query('DELETE FROM security_violations WHERE student_id = $1', [id]);
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User does not exist.' });
      return;
    }

    res.json({ message: 'User deleted successfully.', deletedId: id });
  }
}
