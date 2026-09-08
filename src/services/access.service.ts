import { getDb } from '../database/db.js';
import type { UserTokenPayload } from '../types/auth.types.js';
import { UserRole } from '../config/constants.js';

export function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

export const professorScope = (alias: string, parameter: string) => `(${alias}.professor_id = ${parameter} OR EXISTS (
  SELECT 1 FROM batches ab LEFT JOIN batch_professors ap ON ap.batch_id = ab.id
  WHERE ab.id = ${alias}.batch_id AND (ab.professor_id = ${parameter} OR ap.professor_id = ${parameter})))`;

export async function requireSessionAccess(user: UserTokenPayload, sessionId: string, staffOnly = false): Promise<any> {
  const db = await getDb();
  const result = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  if (!result.rows[0]) throw httpError(404, 'Session not found.');
  const session = result.rows[0];
  if (user.role === UserRole.ADMIN) return session;
  if (user.role === UserRole.PROFESSOR) {
    const allowed = await db.query(`SELECT 1 FROM sessions s WHERE s.id = $1 AND ${professorScope('s', '$2')}`, [sessionId, user.userId]);
    if (allowed.rows.length) return session;
  } else if (!staffOnly && user.role === UserRole.STUDENT) {
    const member = session.batch_id
      ? await db.query('SELECT 1 FROM batch_members WHERE batch_id = $1 AND student_id = $2', [session.batch_id, user.userId])
      : await db.query("SELECT 1 FROM enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'ACTIVE'", [session.course_id, user.userId]);
    if (member.rows.length) return session;
  }
  throw httpError(403, 'You do not have access to this session.');
}
