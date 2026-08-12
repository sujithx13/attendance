import { getDb } from '../database/db.js';
import { Batch, CreateBatchDto, BatchMember } from '../types/batch.types.js';

export class BatchService {
  /**
   * Admin creates a new batch with departmental and multi-year constraints.
   */
  static async createBatch(dto: CreateBatchDto): Promise<Batch> {
    const db = await getDb();
    const id = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await db.query(
      `INSERT INTO batches (
        id, name, code, department_id, professor_id,
        allow_cross_department, allow_multiple_years, allowed_years, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        dto.name.trim(),
        dto.code.toUpperCase().trim(),
        dto.departmentId || null,
        dto.professorId || null,
        dto.allowCrossDepartment ?? false,
        dto.allowMultipleYears ?? false,
        dto.allowedYears || null,
        dto.description || null
      ]
    );

    return this.getBatchById(id) as Promise<Batch>;
  }

  /**
   * Enrolls a student into a batch, rigorously enforcing departmental & academic year rules.
   */
  static async addStudentToBatch(batchId: string, studentId: string): Promise<void> {
    const db = await getDb();

    // 1. Fetch batch rules
    const batchRes = await db.query(
      `SELECT b.*, d.code AS dept_code, d.name AS dept_name
       FROM batches b
       LEFT JOIN departments d ON b.department_id = d.id
       WHERE b.id = $1`,
      [batchId]
    );

    if (batchRes.rows.length === 0) {
      throw new Error(`Batch '${batchId}' not found.`);
    }

    const batch = batchRes.rows[0];

    // 2. Fetch student profile (department & year of study)
    const studentRes = await db.query(
      `SELECT u.id, u.full_name, u.role, u.department_id, u.year_of_study, d.code AS dept_code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      throw new Error(`Student '${studentId}' not found.`);
    }

    const student = studentRes.rows[0];

    // 3. Rule Check A: Cross-Departmental Validation
    if (!batch.allow_cross_department && batch.department_id) {
      if (student.department_id !== batch.department_id) {
        throw new Error(
          `Department mismatch: Batch '${batch.name}' is restricted to ${batch.dept_code || 'its assigned department'}. Student '${student.full_name}' is in ${student.dept_code || 'another department'}.`
        );
      }
    }

    // 4. Rule Check B: Academic Year Validation
    if (!batch.allow_multiple_years && batch.allowed_years && batch.allowed_years.length > 0) {
      if (!student.year_of_study || !batch.allowed_years.includes(student.year_of_study)) {
        throw new Error(
          `Academic Year mismatch: Batch '${batch.name}' only permits Year(s) [${batch.allowed_years.join(', ')}]. Student is in Year ${student.year_of_study || 'Unknown'}.`
        );
      }
    }

    // 5. Insert Batch Membership
    const memberId = `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.query(
      `INSERT INTO batch_members (id, batch_id, student_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (batch_id, student_id) DO NOTHING`,
      [memberId, batchId, studentId]
    );
  }

  /**
   * Retrieves batch details and configured rule policies.
   */
  static async getBatchById(id: string): Promise<Batch | null> {
    const db = await getDb();
    const res = await db.query(
      `SELECT b.*,
              d.code AS department_code, d.name AS department_name,
              u.full_name AS professor_name,
              COUNT(DISTINCT bm.student_id) AS member_count
       FROM batches b
       LEFT JOIN departments d ON b.department_id = d.id
       LEFT JOIN users u ON b.professor_id = u.id
       LEFT JOIN batch_members bm ON bm.batch_id = b.id
       WHERE b.id = $1
       GROUP BY b.id, d.code, d.name, u.full_name`,
      [id]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      departmentId: row.department_id,
      departmentCode: row.department_code,
      departmentName: row.department_name,
      professorId: row.professor_id,
      professorName: row.professor_name,
      allowCrossDepartment: Boolean(row.allow_cross_department),
      allowMultipleYears: Boolean(row.allow_multiple_years),
      allowedYears: row.allowed_years || [],
      description: row.description,
      memberCount: parseInt(row.member_count || '0', 10),
      createdAt: row.created_at
    };
  }

  /**
   * Lists all batches with optional filtering by department or assigned professor.
   */
  static async listBatches(departmentId?: string, professorId?: string): Promise<Batch[]> {
    const db = await getDb();
    let sql = `
      SELECT b.*,
             d.code AS department_code, d.name AS department_name,
             u.full_name AS professor_name,
             COUNT(DISTINCT bm.student_id) AS member_count
      FROM batches b
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN users u ON b.professor_id = u.id
      LEFT JOIN batch_members bm ON bm.batch_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (departmentId) {
      params.push(departmentId);
      sql += ` AND b.department_id = $${params.length}`;
    }

    if (professorId) {
      params.push(professorId);
      sql += ` AND b.professor_id = $${params.length}`;
    }

    sql += ` GROUP BY b.id, d.code, d.name, u.full_name ORDER BY b.name ASC`;

    const res = await db.query(sql, params);
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      departmentId: row.department_id,
      departmentCode: row.department_code,
      departmentName: row.department_name,
      professorId: row.professor_id,
      professorName: row.professor_name,
      allowCrossDepartment: Boolean(row.allow_cross_department),
      allowMultipleYears: Boolean(row.allow_multiple_years),
      allowedYears: row.allowed_years || [],
      description: row.description,
      memberCount: parseInt(row.member_count || '0', 10),
      createdAt: row.created_at
    }));
  }

  /**
   * Lists all students enrolled in a specific batch.
   */
  static async getBatchMembers(batchId: string): Promise<BatchMember[]> {
    const db = await getDb();
    const res = await db.query(
      `SELECT bm.batch_id, bm.student_id, bm.enrolled_at,
              u.full_name AS student_name, u.email, u.enrollment_id, u.year_of_study,
              d.code AS department_code
       FROM batch_members bm
       JOIN users u ON bm.student_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE bm.batch_id = $1
       ORDER BY u.full_name ASC`,
      [batchId]
    );

    return res.rows.map((r) => ({
      batchId: r.batch_id,
      studentId: r.student_id,
      studentName: r.student_name,
      email: r.email,
      enrollmentId: r.enrollment_id,
      departmentCode: r.department_code,
      yearOfStudy: r.year_of_study,
      enrolledAt: r.enrolled_at
    }));
  }

  static async removeStudentFromBatch(batchId: string, studentId: string): Promise<boolean> {
    const db = await getDb();
    const res = await db.query(
      'DELETE FROM batch_members WHERE batch_id = $1 AND student_id = $2 RETURNING id',
      [batchId, studentId]
    );
    return res.rows.length > 0;
  }

  static async deleteBatch(id: string): Promise<boolean> {
    const db = await getDb();
    await db.query('DELETE FROM timetable_slots WHERE batch_id = $1', [id]);
    await db.query('DELETE FROM batch_members WHERE batch_id = $1', [id]);
    const res = await db.query('DELETE FROM batches WHERE id = $1 RETURNING id', [id]);
    return res.rows.length > 0;
  }

  static async updateBatch(
    id: string,
    updates: {
      name?: string;
      code?: string;
      departmentId?: string | null;
      professorId?: string;
      allowCrossDepartment?: boolean;
      allowMultipleYears?: boolean;
      allowedYears?: number[];
      description?: string;
    }
  ): Promise<Batch | null> {
    const db = await getDb();
    await db.query(
      `UPDATE batches
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           department_id = CASE WHEN $10 THEN $3 ELSE department_id END,
           professor_id = COALESCE($4, professor_id),
           allow_cross_department = CASE WHEN $11 THEN $5 ELSE allow_cross_department END,
           allow_multiple_years = CASE WHEN $12 THEN $6 ELSE allow_multiple_years END,
           allowed_years = CASE WHEN $13 THEN $7 ELSE allowed_years END,
           description = CASE WHEN $14 THEN $8 ELSE description END
       WHERE id = $9`,
      [
        updates.name ? updates.name.trim() : null,
        updates.code ? updates.code.toUpperCase().trim() : null,
        updates.departmentId || null,
        updates.professorId || null,
        updates.allowCrossDepartment ?? false,
        updates.allowMultipleYears ?? false,
        updates.allowedYears || null,
        updates.description || null,
        id,
        updates.departmentId !== undefined,
        updates.allowCrossDepartment !== undefined,
        updates.allowMultipleYears !== undefined,
        updates.allowedYears !== undefined,
        updates.description !== undefined
      ]
    );

    return this.getBatchById(id);
  }

  static async getBatchProfessors(batchId: string): Promise<any[]> {
    const db = await getDb();
    const res = await db.query(
      `SELECT bp.id, bp.batch_id, bp.professor_id, bp.role, bp.created_at,
              u.full_name AS professor_name, u.email,
              d.code AS department_code, d.name AS department_name
       FROM batch_professors bp
       JOIN users u ON bp.professor_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE bp.batch_id = $1
       ORDER BY bp.created_at ASC`,
      [batchId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      batchId: r.batch_id,
      professorId: r.professor_id,
      professorName: r.professor_name,
      email: r.email,
      departmentCode: r.department_code,
      departmentName: r.department_name,
      role: r.role,
      createdAt: r.created_at
    }));
  }

  static async addProfessorToBatch(batchId: string, professorId: string, role: string = 'INSTRUCTOR'): Promise<any> {
    const db = await getDb();
    const id = `bp_${batchId}_${professorId}`.slice(0, 64);
    await db.query(
      `INSERT INTO batch_professors (id, batch_id, professor_id, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (batch_id, professor_id) DO UPDATE SET role = EXCLUDED.role`,
      [id, batchId, professorId, role]
    );

    await db.query(
      `UPDATE batches SET professor_id = $1 WHERE id = $2 AND professor_id IS NULL`,
      [professorId, batchId]
    );

    const list = await this.getBatchProfessors(batchId);
    return list.find((p) => p.professorId === professorId);
  }

  static async removeProfessorFromBatch(batchId: string, professorId: string): Promise<boolean> {
    const db = await getDb();
    const res = await db.query(
      'DELETE FROM batch_professors WHERE batch_id = $1 AND professor_id = $2 RETURNING id',
      [batchId, professorId]
    );

    await db.query(
      `UPDATE batches
       SET professor_id = (SELECT professor_id FROM batch_professors WHERE batch_id = $1 LIMIT 1)
       WHERE id = $1 AND professor_id = $2`,
      [batchId, professorId]
    );

    return res.rows.length > 0;
  }
}
