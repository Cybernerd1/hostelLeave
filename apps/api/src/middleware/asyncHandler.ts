/**
 * Async Handler Wrapper
 *
 * Wraps async route handlers to automatically catch errors
 * and forward them to the global error handler.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>;

/**
 * Wrap an async route handler to catch rejected promises.
 * Eliminates the need for try-catch in every controller method.
 */
export function asyncHandler(fn: AsyncRouteHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
