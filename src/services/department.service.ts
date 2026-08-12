import { getDb } from '../database/db.js';
import { Department } from '../types/department.types.js';

export class DepartmentService {
  static async listDepartments(): Promise<Department[]> {
    const db = await getDb();
    const res = await db.query('SELECT * FROM departments ORDER BY code ASC');
    return res.rows;
  }

  static async createDepartment(code: string, name: string): Promise<Department> {
    const db = await getDb();
    const id = `dept_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanCode = code.toUpperCase().trim();

    await db.query(
      `INSERT INTO departments (id, code, name) VALUES ($1, $2, $3)`,
      [id, cleanCode, name.trim()]
    );

    return { id, code: cleanCode, name: name.trim() };
  }

  static async getDepartmentById(id: string): Promise<Department | null> {
    const db = await getDb();
    const res = await db.query('SELECT * FROM departments WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async updateDepartment(id: string, code?: string, name?: string): Promise<Department | null> {
    const db = await getDb();
    await db.query(
      `UPDATE departments
       SET code = COALESCE($1, code),
           name = COALESCE($2, name)
       WHERE id = $3`,
      [code ? code.toUpperCase().trim() : null, name ? name.trim() : null, id]
    );
    return this.getDepartmentById(id);
  }

  static async deleteDepartment(id: string): Promise<boolean> {
    const db = await getDb();
    const res = await db.query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
    return res.rows.length > 0;
  }
}
