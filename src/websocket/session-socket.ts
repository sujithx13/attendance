import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { QrService } from '../services/qr.service.js';
import { ENV } from '../config/env.js';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/db.js';
import { requireSessionAccess } from '../services/access.service.js';
import { UserRole } from '../config/constants.js';
import type { UserTokenPayload } from '../types/auth.types.js';
import { DisplayService } from '../services/display.service.js';

interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  role: 'PROFESSOR' | 'STUDENT' | 'DISPLAY' | 'ADMIN';
  intervalId?: NodeJS.Timeout;
  expiryId?: NodeJS.Timeout;
}

export class SessionSocketServer {
  private static wss: WebSocketServer;
  private static sessionClients: Map<string, Set<ClientConnection>> = new Map();

  /**
   * Initializes WebSocket Server on the HTTP Server instance.
   */
  static init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16384 });

    this.wss.on('connection', (ws: WebSocket, req) => {
      let clientSessionId: string | null = null;
      let currentConn: ClientConnection | null = null;
      let subscribing = false;
      const authenticationTimeout = setTimeout(() => { if (!currentConn) ws.close(1008, "Authentication required"); }, 10000);

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'SUBSCRIBE_DISPLAY' && typeof data.token === 'string') {
            if (currentConn || subscribing) throw new Error('Only one subscription is allowed per connection.');
            subscribing = true;
            try {
              const claims = DisplayService.verifyToken(data.token);
              await DisplayService.validatePairing(claims.pairingId, claims.sessionId);
              if (ws.readyState !== WebSocket.OPEN) return;
              clientSessionId = claims.sessionId;
              currentConn = { ws, sessionId: claims.sessionId, role: 'DISPLAY' };
              clearTimeout(authenticationTimeout);
              currentConn.expiryId = setTimeout(() => ws.close(1008, 'Display credential expired'), Math.max(0, claims.exp * 1000 - Date.now()));
              if (!this.sessionClients.has(claims.sessionId)) this.sessionClients.set(claims.sessionId, new Set());
              this.sessionClients.get(claims.sessionId)!.add(currentConn);
              ws.send(JSON.stringify({ type: 'SUBSCRIBED', sessionId: claims.sessionId }));
              await this.sendNewQr(ws, claims.sessionId);
              currentConn.intervalId = setInterval(async () => {
                try {
                  DisplayService.verifyToken(data.token);
                  await DisplayService.validatePairing(claims.pairingId, claims.sessionId);
                  await this.sendNewQr(ws, claims.sessionId);
                } catch {
                  if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'ERROR', message: 'The display was disconnected or the attendance session ended.' })); ws.close(1008, 'Display ended'); }
                }
              }, ENV.QR_ROTATION_INTERVAL_SECONDS * 1000);
            } finally { subscribing = false; }
            return;
          }

          if (data.type !== 'SUBSCRIBE' || typeof data.token !== 'string') throw new Error('Authenticated subscription required.');
          if (currentConn || subscribing) throw new Error('Only one subscription is allowed per connection.');
          subscribing = true;
          try {
            const claims = jwt.verify(data.token, ENV.JWT_SECRET) as UserTokenPayload;
            const db = await getDb();
            const user = await db.query('SELECT role FROM users WHERE id = $1', [claims.userId]);
            if (!user.rows[0]) throw new Error('Account no longer exists.');
            const role = user.rows[0].role as UserRole;
            if (role === UserRole.STUDENT) throw new Error('Student accounts cannot subscribe to attendance streams.');
            const campus = data.sessionId === 'CAMPUS';
            if (campus && role !== UserRole.ADMIN) throw new Error('Administrator access required for campus stream.');
            if (!campus) await requireSessionAccess({ ...claims, role }, data.sessionId, true);
            if (ws.readyState !== WebSocket.OPEN) return;
            clientSessionId = data.sessionId;
            currentConn = { ws, sessionId: data.sessionId, role } as ClientConnection;
            clearTimeout(authenticationTimeout);
            const expiryMs = Math.max(0, ((claims as any).exp * 1000) - Date.now());
            currentConn.expiryId = setTimeout(() => ws.close(1008, 'Token expired'), Math.min(expiryMs, 2147483647));
            currentConn.expiryId.unref();
            if (!this.sessionClients.has(data.sessionId)) this.sessionClients.set(data.sessionId, new Set());
            this.sessionClients.get(data.sessionId)!.add(currentConn);
            ws.send(JSON.stringify({ type: 'SUBSCRIBED', sessionId: data.sessionId }));
            if (!campus) {
              this.sendNewQr(ws, data.sessionId);
            }
            const subscribedId = data.sessionId;
            currentConn.intervalId = setInterval(async () => {
              try {
                jwt.verify(data.token, ENV.JWT_SECRET);
                const activeDb = await getDb();
                const account = await activeDb.query('SELECT role FROM users WHERE id = $1', [claims.userId]);
                if (account.rows[0]?.role !== role) throw new Error('Account access changed.');
                if (!campus) {
                  await requireSessionAccess({ ...claims, role }, subscribedId, true);
                  await this.sendNewQr(ws, subscribedId);
                }
              } catch { ws.close(1008, 'Authorization expired'); }
            }, ENV.QR_ROTATION_INTERVAL_SECONDS * 1000);
          } finally { subscribing = false; }
        } catch (err: any) {
          if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'ERROR', message: err.message })); ws.close(1008, 'Subscription rejected'); }
        }
      });

      ws.on('close', () => {
        clearTimeout(authenticationTimeout);
        if (currentConn && clientSessionId) {
          if (currentConn.expiryId) clearTimeout(currentConn.expiryId);
          if (currentConn.intervalId) {
            clearInterval(currentConn.intervalId);
          }
          const room = this.sessionClients.get(clientSessionId);
          if (room) {
            room.delete(currentConn);
            if (room.size === 0) {
              this.sessionClients.delete(clientSessionId);
            }
          }
          console.log(`[WebSocket] Client disconnected from session ${clientSessionId}.`);
        }
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Connection error:', err.message);
      });
    });

    console.log('[WebSocket] Real-time session socket server initialized on path /ws.');
  }

  /**
   * Generates and transmits a fresh rotating cryptographic QR payload to the client.
   */
  private static async sendNewQr(ws: WebSocket, sessionId: string): Promise<void> {
    try {
      const db = await getDb();
      const session = await db.query("SELECT 1 FROM sessions WHERE id = $1 AND status = 'ACTIVE' AND end_time > CURRENT_TIMESTAMP", [sessionId]);
      if (!session.rows.length || ws.readyState !== WebSocket.OPEN) return;
      const { payload, tokenObj } = QrService.generateSessionBroadcastPayload(sessionId);
      const dataUrl = await QrService.renderQrCode(payload, 'dataUrl');

      ws.send(JSON.stringify({
        type: 'QR_ROTATION',
        sessionId,
        qrPayload: payload,
        qrDataUrl: dataUrl,
        timestamp: tokenObj.timestamp,
        expiresAt: tokenObj.exp,
        expiresInSeconds: tokenObj.exp - tokenObj.timestamp
      }));
    } catch (err: any) {
      console.error('[WebSocket] Error sending rotating QR:', err.message);
    }
  }

  /**
   * Broadcasts a real-time student check-in event to the professor's dashboard.
   */
  static broadcastCheckIn(sessionId: string, checkInData: Record<string, any>): void {
    const clients = new Set([...(this.sessionClients.get(sessionId) || []), ...(this.sessionClients.get('CAMPUS') || [])]);
    if (!clients.size) return;

    const message = JSON.stringify({
      type: 'STUDENT_CHECK_IN',
      sessionId,
      data: checkInData
    });

    for (const client of clients) {
      if (client.role === 'DISPLAY') continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }
}
