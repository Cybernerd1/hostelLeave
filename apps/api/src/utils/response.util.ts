/**
 * API Response Utilities
 *
 * Standardized response wrappers ensuring all API responses
 * follow a consistent format.
 */

import type { Response } from 'express';
import type { PaginationMeta } from '@hostel/shared-types';

/**
 * Send a success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send a created response (201).
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message: string = 'Created successfully',
): void {
  sendSuccess(res, data, message, 201);
}

/**
 * Send a paginated response.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message: string = 'Success',
): void {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send an error response.
 */
export function sendError(
  res: Response,
  message: string = 'Internal server error',
  statusCode: number = 500,
  error?: string,
  errors?: Array<{ field: string; message: string }>,
): void {
  const response: Record<string, unknown> = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (error) {
    response.error = error;
  }

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
}

/**
 * Send a no-content response (204).
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Build pagination metadata from query parameters and total count.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
