/**
 * Custom Application Error
 *
 * Extends Error to include HTTP status code and operational flag.
 * Used by the global error handler to distinguish operational errors from bugs.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Capture proper stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** 400 Bad Request */
  static badRequest(message: string = 'Bad request'): AppError {
    return new AppError(message, 400, 'BAD_REQUEST');
  }

  /** 401 Unauthorized */
  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  /** 403 Forbidden */
  static forbidden(message: string = 'Access denied'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  /** 404 Not Found */
  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  /** 409 Conflict */
  static conflict(message: string = 'Resource already exists'): AppError {
    return new AppError(message, 409, 'CONFLICT');
  }

  /** 422 Unprocessable Entity */
  static unprocessable(message: string = 'Unprocessable entity'): AppError {
    return new AppError(message, 422, 'UNPROCESSABLE');
  }

  /** 429 Too Many Requests */
  static tooManyRequests(message: string = 'Too many requests'): AppError {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }

  /** 500 Internal Server Error */
  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR', false);
  }
}
