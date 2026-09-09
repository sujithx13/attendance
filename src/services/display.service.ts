import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getDb, withTransaction } from '../database/db.js';
import { ENV } from '../config/env.js';
import { requireSessionAccess, httpError } from './access.service.js';
import type { UserTokenPayload } from '../types/auth.types.js';
import { UserRole } from '../config/constants.js';

const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const displaySecret = crypto.createHmac('sha256', ENV.JWT_SECRET).update('classroom-display-v1').digest('hex');
type DisplayClaims = { purpose: 'classroom-display'; pairingId: string; sessionId: string; exp: number };

export class DisplayService {
  static async createPairing() {
    const db = await getDb();
    await db.query('DELETE FROM classroom_displays WHERE expires_at < CURRENT_TIMESTAMP');
    const id = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('base64url');
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 8 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    await db.query(`INSERT INTO classroom_displays (id, code_hash, secret_hash, expires_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '5 minutes')`, [id, hash(code), hash(secret)]);
    return { code, deviceSecret: secret, expiresInSeconds: 300 };
  }

  static async claim(user: UserTokenPayload, sessionId: string, rawCode: unknown) {
    if (typeof rawCode !== 'string' || !/^[A-Z2-9]{8}$/.test(rawCode.replace(/[\s-]/g, '').toUpperCase())) throw httpError(400, 'Enter the eight-character code shown on the big screen.');
    const code = rawCode.replace(/[\s-]/g, '').toUpperCase();
    return withTransaction(async () => {
      const session = await requireSessionAccess(user, sessionId, true);
      if (session.status !== 'ACTIVE' || new Date(session.end_time) <= new Date()) throw httpError(409, 'Start an active attendance session before pairing a screen.');
      const db = await getDb();
      const result = await db.query(`UPDATE classroom_displays SET session_id = $1, owner_id = $2, expires_at = $3
        WHERE code_hash = $4 AND session_id IS NULL AND revoked = FALSE AND expires_at > CURRENT_TIMESTAMP RETURNING id`, [sessionId, user.userId, session.end_time, hash(code)]);
      if (!result.rows.length) throw httpError(409, 'That code has expired or is already paired. Refresh the display page for a new code.');
      return { pairingId: result.rows[0].id, message: 'Big screen connected.' };
    });
  }

  static async state(secret: string) {
    const db = await getDb();
    const result = await db.query('SELECT * FROM classroom_displays WHERE secret_hash = $1', [hash(secret)]);
    const pairing = result.rows[0];
    if (!pairing || pairing.revoked || new Date(pairing.expires_at) <= new Date()) throw httpError(410, 'Display pairing has ended.');
    if (!pairing.session_id) return { status: 'WAITING' };
    const metadata = await this.validatePairing(pairing.id, pairing.session_id);
    const token = jwt.sign({ purpose: 'classroom-display', pairingId: pairing.id, sessionId: pairing.session_id }, displaySecret, { audience: 'classroom-display', expiresIn: '5m' });
    return { status: 'PAIRED', displayToken: token, sessionId: pairing.session_id, title: metadata.title, classroom: metadata.classroom };
  }

  static verifyToken(token: string): DisplayClaims {
    const claims = jwt.verify(token, displaySecret, { audience: 'classroom-display', algorithms: ['HS256'] }) as DisplayClaims;
    if (claims.purpose !== 'classroom-display' || !claims.pairingId || !claims.sessionId) throw httpError(403, 'Invalid display token.');
    return claims;
  }

  static async validatePairing(pairingId: string, sessionId: string) {
    const db = await getDb();
    const result = await db.query(`SELECT d.*, s.status, s.end_time, u.role,
      COALESCE(c.name, b.name, 'Classroom attendance') AS title, clr.name AS classroom
      FROM classroom_displays d JOIN sessions s ON d.session_id = s.id
      JOIN users u ON d.owner_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id LEFT JOIN batches b ON s.batch_id = b.id
      JOIN classrooms clr ON s.classroom_id = clr.id WHERE d.id = $1 AND d.session_id = $2`, [pairingId, sessionId]);
    const row = result.rows[0];
    if (!row || row.revoked || row.status !== 'ACTIVE' || new Date(row.end_time) <= new Date() || new Date(row.expires_at) <= new Date() || ![UserRole.PROFESSOR, UserRole.ADMIN].includes(row.role)) throw httpError(410, 'The classroom display session has ended.');
    await requireSessionAccess({ userId: row.owner_id, role: row.role, email: '', fullName: '' }, sessionId, true);
    return row;
  }

  static async revoke(user: UserTokenPayload, sessionId: string) {
    await requireSessionAccess(user, sessionId, true);
    const db = await getDb();
    await db.query('UPDATE classroom_displays SET revoked = TRUE WHERE session_id = $1', [sessionId]);
  }

  static async disconnectDevice(secret: string) {
    const db = await getDb();
    await db.query('UPDATE classroom_displays SET revoked = TRUE WHERE secret_hash = $1', [hash(secret)]);
  }
}
