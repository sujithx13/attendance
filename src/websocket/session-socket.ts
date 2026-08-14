import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { QrService } from '../services/qr.service.js';
import { ENV } from '../config/env.js';

interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  role: 'PROFESSOR' | 'STUDENT' | 'DISPLAY';
  intervalId?: NodeJS.Timeout;
}

export class SessionSocketServer {
  private static wss: WebSocketServer;
  private static sessionClients: Map<string, Set<ClientConnection>> = new Map();

  /**
   * Initializes WebSocket Server on the HTTP Server instance.
   */
  static init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      let clientSessionId: string | null = null;
      let currentConn: ClientConnection | null = null;

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());

          // Handle SUBSCRIBE message
          if (data.type === 'SUBSCRIBE' && data.sessionId) {
            clientSessionId = data.sessionId;
            const role = data.role || 'DISPLAY';

            currentConn = { ws, sessionId: clientSessionId!, role };

            if (!this.sessionClients.has(clientSessionId!)) {
              this.sessionClients.set(clientSessionId!, new Set());
            }
            this.sessionClients.get(clientSessionId!)!.add(currentConn);

            console.log(`[WebSocket] Client subscribed to session ${clientSessionId} (role: ${role}).`);

            ws.send(JSON.stringify({
              type: 'SUBSCRIBED',
              sessionId: clientSessionId,
              message: `Subscribed to session stream for ${clientSessionId}`
            }));

            // If it is a DISPLAY or PROFESSOR connection, start streaming rotating QR codes
            if (role === 'DISPLAY' || role === 'PROFESSOR') {
              this.sendNewQr(ws, clientSessionId!);

              // Rotate QR every N seconds
              const rotationMs = (ENV.QR_ROTATION_INTERVAL_SECONDS || 15) * 1000;
              currentConn.intervalId = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN && clientSessionId) {
                  this.sendNewQr(ws, clientSessionId);
                }
              }, rotationMs);
            }
          }
        } catch (err: any) {
          ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
        }
      });

      ws.on('close', () => {
        if (currentConn && clientSessionId) {
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
    const clients = this.sessionClients.get(sessionId);
    if (!clients || clients.size === 0) return;

    const message = JSON.stringify({
      type: 'STUDENT_CHECK_IN',
      sessionId,
      data: checkInData
    });

    for (const client of clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }
}
