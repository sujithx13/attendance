import express, { Express } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import flowRoutes from './routes/flow.routes.js';
import sessionRoutes from './routes/session.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import classroomRoutes from './routes/classroom.routes.js';
import courseRoutes from './routes/course.routes.js';
import departmentRoutes from './routes/department.routes.js';
import batchRoutes from './routes/batch.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import userRoutes from './routes/user.routes.js';
import templateRoutes from './routes/template.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import displayRoutes from './routes/display.routes.js';
import path from 'node:path';

export function createApp(): Express {
  const app = express();

  // Standard middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/display', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
  }, express.static(path.resolve(process.cwd(), 'public', 'display')));
  app.get('/downloads/kahe-attendance-preview.apk', (_req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(path.resolve(process.cwd(), 'artifacts', 'kahe-attendance-preview.apk'));
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Server-Driven College Attendance Backend',
      version: '2.0.0'
    });
  });

  // API Discovery & System Specification Root
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'Server-Driven College Attendance System Backend',
      version: '2.0.0',
      description: 'Backend-authoritative, Server-Driven UI configuration & 5-Layer Fraud Mitigation Attendance Engine',
      antiSpoofingLayers: [
        'Layer 1: Time-Bound Cryptographic Rotating QR (HMAC-SHA256 & Replay Prevention)',
        'Layer 2: Capability-Aware Spatial Geofencing (Haversine & Precision Filtering)',
        'Layer 3: Client Mock Location & GPS Spoofing Detection',
        'Layer 4: Policy-Driven Multi-Condition Evaluation (Accept, Challenge, Reject)',
        'Layer 5: Multi-Factor Biometric Verification (Cosine Embedding Similarity)'
      ],
      apiPrefix: '/api/v1',
      endpoints: {
        auth: '/api/v1/auth',
        serverDrivenFlows: '/api/v1/flows',
        sessions: '/api/v1/sessions',
        attendance: '/api/v1/attendance',
        analytics: '/api/v1/analytics',
        classrooms: '/api/v1/classrooms',
        courses: '/api/v1/courses',
        departments: '/api/v1/departments',
        batches: '/api/v1/batches',
        timetable: '/api/v1/timetable',
        websocketStream: 'ws://HOST:PORT/ws'
      }
    });
  });

  // Mount API v1 routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/display', displayRoutes);
  app.use('/api/v1/flows', flowRoutes);
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/classrooms', classroomRoutes);
  app.use('/api/v1/courses', courseRoutes);
  app.use('/api/v1/departments', departmentRoutes);
  app.use('/api/v1/batches', batchRoutes);
  app.use('/api/v1/timetable', timetableRoutes);
  app.use('/api/v1/timetable/templates', templateRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/announcements', announcementRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
