/**
 * Winston Logger Configuration
 *
 * Structured logging with file rotation for production
 * and colorized console output for development.
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

import { config } from '../config';

// Ensure log directory exists
const logDir = path.resolve(config.log.dir);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      msg += `\n${stack}`;
    }
    return msg;
  }),
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let msg = `${timestamp} ${level}: ${message}`;
    if (stack) {
      msg += `\n${stack}`;
    }
    return msg;
  }),
);

// Transports
const transports: winston.transport[] = [
  // Console - always active
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// File transports - only in non-test environments
if (!config.isTest) {
  transports.push(
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  );
}

export const logger = winston.createLogger({
  level: config.log.level,
  defaultMeta: { service: 'hostel-leave-api' },
  transports,
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

/**
 * Morgan stream for HTTP request logging.
 */
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
