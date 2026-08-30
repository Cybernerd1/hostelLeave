/**
 * Global Error Handler Middleware
 *
 * Catches all errors thrown by route handlers and returns
 * standardized error responses.
 */

import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import { AppError } from '../utils/AppError';
import { sendError } from '../utils/response.util';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Global error handler - must be registered LAST in the middleware chain.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let errorCode: string | undefined;
  const errors: Array<{ field: string; message: string }> = [];

  // AppError (our custom operational errors)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.code;
  }
  // Mongoose validation error
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    Object.values(err.errors).forEach((e) => {
      errors.push({
        field: e.path,
        message: e.message,
      });
    });
  }
  // Mongoose cast error (invalid ObjectId, etc.)
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    errorCode = 'CAST_ERROR';
  }
  // MongoDB duplicate key error
  else if (err.name === 'MongoServerError' && (err as unknown as Record<string, unknown>).code === 11000) {
    statusCode = 409;
    const keyValue = (err as unknown as Record<string, unknown>).keyValue as Record<string, unknown>;
    const field = Object.keys(keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}. This ${field} already exists.`;
    errorCode = 'DUPLICATE_KEY';
  }
  // JSON parse error
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
    errorCode = 'JSON_PARSE_ERROR';
  }
  // Multer file upload errors
  else if (err.name === 'MulterError') {
    statusCode = 400;
    const multerErr = err as Error & { code: string };
    switch (multerErr.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 5MB.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum is 5 files.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field.';
        break;
      default:
        message = 'File upload error.';
    }
    errorCode = 'FILE_UPLOAD_ERROR';
  }

  // Log the error
  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${message}`, {
      error: err.message,
      stack: err.stack,
    });
  } else {
    logger.warn(`[${statusCode}] ${message}`);
  }

  // Send response
  sendError(
    res,
    message,
    statusCode,
    config.isDevelopment ? err.stack : errorCode,
    errors.length > 0 ? errors : undefined,
  );
}

/**
 * 404 Not Found handler for unmatched routes.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}
