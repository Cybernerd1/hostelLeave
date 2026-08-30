/**
 * Authentication Validation Schemas
 *
 * Zod schemas for validating auth-related API requests.
 * Used on both client-side (React Hook Form) and server-side (Express middleware).
 */

import { z } from 'zod';

/** Login schema */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
});

/** Refresh token schema */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .min(1, 'Refresh token is required'),
});

/** Change password schema */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(6, 'Password must be at least 6 characters'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      ),
    confirmPassword: z.string({ required_error: 'Confirm password is required' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/** Type exports inferred from schemas */
export type LoginSchemaType = z.infer<typeof loginSchema>;
export type RefreshTokenSchemaType = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordSchemaType = z.infer<typeof changePasswordSchema>;
