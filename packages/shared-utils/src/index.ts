/**
 * Hostel Leave Management System - Shared Utilities
 *
 * Barrel export for all shared utilities, validation schemas, and constants.
 * Import from '@hostel/shared-utils' in any workspace package.
 */

// Validation schemas
export * from './validation';

// Constants
export * from './constants';

// Helpers
export {
  formatDate,
  formatDateTime,
  toISODateString,
  calculateDays,
  isPastDate,
  isToday,
  getRelativeTime,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  addHours,
} from './helpers/date';

export {
  generateLeaveId,
  generateRandomString,
  slugify,
  titleCase,
  truncate,
  sanitize,
  maskEmail,
  maskPhone,
  formatFileSize,
  getFileExtension,
  generateUploadFilename,
} from './helpers/string';
