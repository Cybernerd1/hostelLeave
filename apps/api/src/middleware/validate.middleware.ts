/**
 * Validation Middleware
 *
 * Uses Zod schemas to validate request body, query, and params.
 */

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';

import { sendError } from '../utils/response.util';

/**
 * Validate request body against a Zod schema.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors);
      return;
    }

    // Replace body with parsed (and transformed) data
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, 'Invalid query parameters', 400, 'VALIDATION_ERROR', errors);
      return;
    }

    // Replace query with parsed data
    req.query = result.data;
    next();
  };
}

/**
 * Validate route parameters against a Zod schema.
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, 'Invalid route parameters', 400, 'VALIDATION_ERROR', errors);
      return;
    }

    req.params = result.data;
    next();
  };
}

/**
 * Format Zod errors into our standard error format.
 */
function formatZodErrors(error: ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((err) => ({
    field: err.path.join('.') || 'unknown',
    message: err.message,
  }));
}
