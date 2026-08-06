import http from 'http';
import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { runMigrations } from './database/migrate.js';
import { SessionSocketServer } from './websocket/session-socket.js';
import { getDb } from './database/db.js';

async function startServer(): Promise<void> {
  try {
    console.log('====================================================');
    console.log('Starting Server-Driven College Attendance Backend...');
    console.log('====================================================');

    // Run database migrations
    await runMigrations();

    // Create Express app
    const app = createApp();
    const server = http.createServer(app);

    // Initialize Real-time WebSockets
    SessionSocketServer.init(server);

    // Start HTTP & WebSocket listener
    server.listen(ENV.PORT, ENV.HOST, () => {
      console.log(`[Server] REST API listening at: http://${ENV.HOST}:${ENV.PORT}`);
      console.log(`[Server] Real-time WebSockets active at: ws://${ENV.HOST}:${ENV.PORT}/ws`);
      console.log(`[Server] Health check available at: http://${ENV.HOST}:${ENV.PORT}/health`);
      console.log('====================================================');
    });

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        try {
          const db = await getDb();
          await db.close();
          console.log('[Database] Connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('[Shutdown Error]', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err: any) {
    console.error('[Fatal Error starting server]:', err);
    process.exit(1);
  }
}

startServer();
