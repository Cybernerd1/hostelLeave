/**
 * Express Application Configuration
 *
 * Configures the Express app with all middleware, routes, and error handling.
 * This module is separate from server.ts for testability.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';

import { corsOptions } from './config/cors';
import { config } from './config';
import { generalLimiter } from './middleware/rateLimiter.middleware';
import { auditContext } from './middleware/audit.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { morganStream } from './utils/logger';

// Routes
import authRoutes from './modules/auth/auth.routes';
import leaveRoutes from './modules/leave/leave.routes';
import guardRoutes from './modules/guard/guard.routes';
import qrRoutes from './modules/qr/qr.routes';
import notificationRoutes from './modules/notification/notification.routes';
import adminRoutes from './modules/admin/admin.routes';
import reportRoutes from './modules/reports/reports.routes';

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));

// ─── Request Parsing ─────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ─────────────────────────────────────────────────────────────────

if (!config.isTest) {
  app.use(morgan('combined', { stream: morganStream }));
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

app.use('/api/', generalLimiter);

// ─── Audit Context ───────────────────────────────────────────────────────────

app.use(auditContext);

// ─── Static Files (Uploads) ─────────────────────────────────────────────────

app.use('/uploads', express.static(path.resolve(config.upload.dir)));

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hostel Leave Management API is running',
    data: {
      environment: config.env,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    },
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/leaves', qrRoutes);
app.use('/api/v1/guard', guardRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reports', reportRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
