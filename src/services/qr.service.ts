import crypto from 'crypto';
import QRCode from 'qrcode';
import { ENV } from '../config/env.js';
import { getDb } from '../database/db.js';

export interface QrTokenPayload {
  type: 'SESSION_BROADCAST' | 'STUDENT_PERSONAL';
  sessionId: string;
  studentId?: string;
  nonce: string;
  timestamp: number; // Unix timestamp in seconds
  exp: number;       // Expiration timestamp in seconds
  isExported?: boolean;
}

export class QrService {
  private static hmacSecret = ENV.QR_HMAC_SECRET;

  /**
   * Generates a signed cryptographic QR payload for the professor's live classroom display.
   */
  static generateSessionBroadcastPayload(
    sessionId: string,
    expiresInSeconds: number = ENV.QR_EXPIRATION_SECONDS,
    isExported: boolean = false
  ): { payload: string; tokenObj: QrTokenPayload & { signature: string } } {
    const now = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    const exp = now + expiresInSeconds;

    const tokenObj: QrTokenPayload = {
      type: 'SESSION_BROADCAST',
      sessionId,
      nonce,
      timestamp: now,
      exp,
      isExported
    };

    const signature = this.signPayload(tokenObj);
    const fullToken = { ...tokenObj, signature };
    const payload = Buffer.from(JSON.stringify(fullToken)).toString('base64url');

    return { payload, tokenObj: fullToken };
  }

  /**
   * Generates a signed cryptographic QR payload for student reverse scanning.
   */
  static generateStudentPersonalPayload(
    sessionId: string,
    studentId: string,
    expiresInSeconds: number = 30
  ): { payload: string; tokenObj: QrTokenPayload & { signature: string } } {
    const now = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    const exp = now + expiresInSeconds;

    const tokenObj: QrTokenPayload = {
      type: 'STUDENT_PERSONAL',
      sessionId,
      studentId,
      nonce,
      timestamp: now,
      exp,
      isExported: false
    };

    const signature = this.signPayload(tokenObj);
    const fullToken = { ...tokenObj, signature };
    const payload = Buffer.from(JSON.stringify(fullToken)).toString('base64url');

    return { payload, tokenObj: fullToken };
  }

  /**
   * Decodes and validates cryptographic signature, timestamp freshness, and session match.
   */
  static verifyPayload(
    encodedPayload: string,
    expectedSessionId: string,
    expectedType?: 'SESSION_BROADCAST' | 'STUDENT_PERSONAL',
    clockDriftToleranceSeconds: number = 5
  ): { isValid: boolean; reason?: string; token?: QrTokenPayload & { signature: string } } {
    try {
      const decodedString = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
      const token = JSON.parse(decodedString) as QrTokenPayload & { signature: string };

      if (!token.signature || !token.nonce || !token.timestamp || !token.exp || !token.sessionId) {
        return { isValid: false, reason: 'MALFORMED_QR_PAYLOAD' };
      }

      if (expectedType && token.type !== expectedType) {
        return { isValid: false, reason: `INVALID_TOKEN_TYPE_EXPECTED_${expectedType}` };
      }

      if (token.sessionId !== expectedSessionId) {
        return { isValid: false, reason: 'SESSION_MISMATCH' };
      }

      // Verify HMAC signature
      const expectedSignature = this.signPayload({
        type: token.type,
        sessionId: token.sessionId,
        studentId: token.studentId,
        nonce: token.nonce,
        timestamp: token.timestamp,
        exp: token.exp,
        isExported: token.isExported
      });

      const signatureBuffer = Buffer.from(token.signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (
        signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
      ) {
        return { isValid: false, reason: 'FORGED_CRYPTOGRAPHIC_SIGNATURE' };
      }

      // Verify expiration with grace period
      const now = Math.floor(Date.now() / 1000);
      if (now > token.exp + clockDriftToleranceSeconds) {
        return { isValid: false, reason: 'EXPIRED_QR_TOKEN', token };
      }

      return { isValid: true, token };
    } catch {
      return { isValid: false, reason: 'DECODE_ERROR' };
    }
  }

  /**
   * Atomically checks and records nonce to prevent replay attacks.
   */
  static async checkAndConsumeNonce(
    nonce: string,
    sessionId: string,
    studentId: string,
    expiresAtTimestamp: number
  ): Promise<{ isFresh: boolean; reason?: string }> {
    const db = await getDb();
    const expiresAt = new Date(expiresAtTimestamp * 1000);

    try {
      // Check if nonce already exists
      const existing = await db.query(
        'SELECT nonce FROM used_qr_nonces WHERE nonce = $1',
        [nonce]
      );

      if (existing.rows.length > 0) {
        return { isFresh: false, reason: 'REPLAY_ATTACK_NONCE_ALREADY_USED' };
      }

      // Record nonce
      await db.query(
        'INSERT INTO used_qr_nonces (nonce, session_id, student_id, expires_at) VALUES ($1, $2, $3, $4)',
        [nonce, sessionId, studentId, expiresAt]
      );

      return { isFresh: true };
    } catch (err: any) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        return { isFresh: false, reason: 'REPLAY_ATTACK_CONCURRENT_RACE' };
      }
      throw err;
    }
  }

  /**
   * Generates QR Code as PNG Buffer, SVG string, or Data URL.
   */
  static async renderQrCode(
    payload: string,
    format: 'png' | 'svg' | 'dataUrl' = 'dataUrl'
  ): Promise<string | Buffer> {
    if (format === 'svg') {
      return await QRCode.toString(payload, { type: 'svg', margin: 2 });
    } else if (format === 'png') {
      return await QRCode.toBuffer(payload, { type: 'png', margin: 2, width: 400 });
    } else {
      return await QRCode.toDataURL(payload, { margin: 2, width: 400 });
    }
  }

  private static signPayload(payload: QrTokenPayload): string {
    const serialized = `${payload.type}|${payload.sessionId}|${payload.studentId || ''}|${payload.nonce}|${payload.timestamp}|${payload.exp}|${payload.isExported ? '1' : '0'}`;
    return crypto.createHmac('sha256', this.hmacSecret).update(serialized).digest('hex');
  }
}
