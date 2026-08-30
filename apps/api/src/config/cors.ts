/**
 * CORS Configuration
 */

import type { CorsOptions } from 'cors';

import { config } from './index';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (config.corsOrigin.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all localhost origins
    if (config.isDevelopment && origin.includes('localhost')) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400, // 24 hours
};
