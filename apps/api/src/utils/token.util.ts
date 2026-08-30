/**
 * JWT Token Utilities
 *
 * Handles token generation, verification, and refresh token management.
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import type { UserRole } from '@hostel/shared-types';

import { config } from '../config';
import { AppError } from './AppError';

/** JWT payload structure */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/** Decoded token with standard JWT fields */
export interface DecodedToken extends JWTPayload {
  iat: number;
  exp: number;
}

/**
 * Generate an access token.
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  });
}

/**
 * Generate a refresh token string.
 */
export function generateRefreshToken(): string {
  return uuidv4();
}

/**
 * Verify and decode an access token.
 * @throws AppError if token is invalid or expired
 */
export function verifyAccessToken(token: string): DecodedToken {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized('Invalid access token');
    }
    throw AppError.unauthorized('Token verification failed');
  }
}

/**
 * Extract token from Authorization header.
 * Expects format: "Bearer <token>"
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1] || null;
}

/**
 * Calculate refresh token expiry date.
 */
export function getRefreshTokenExpiry(): Date {
  const expiry = config.jwt.refreshExpiry;
  const now = new Date();

  // Parse expiry string (e.g., "7d", "30d", "1h")
  const match = expiry.match(/^(\d+)([dhms])$/);
  if (!match) {
    // Default to 7 days
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    case 'h':
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'm':
      return new Date(now.getTime() + value * 60 * 1000);
    case 's':
      return new Date(now.getTime() + value * 1000);
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}
