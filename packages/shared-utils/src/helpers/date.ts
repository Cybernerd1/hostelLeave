/**
 * Date Utility Functions
 *
 * Shared date formatting and calculation helpers used across all apps.
 */

/**
 * Format a date to a human-readable string.
 * @example formatDate(new Date()) => "22 Jul 2025"
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date to include time.
 * @example formatDateTime(new Date()) => "22 Jul 2025, 02:30 PM"
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date to ISO date string (YYYY-MM-DD).
 */
export function toISODateString(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Calculate the number of days between two dates (inclusive).
 */
export function calculateDays(fromDate: Date | string, toDate: Date | string): number {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to.getTime() - from.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Check if a date is in the past.
 */
export function isPastDate(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < now;
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

/**
 * Get the relative time string (e.g., "2 hours ago", "3 days ago").
 */
export function getRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  }
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
  return formatDate(d);
}

/**
 * Get the start of a day (00:00:00.000).
 */
export function startOfDay(date: Date | string): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of a day (23:59:59.999).
 */
export function endOfDay(date: Date | string): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get the start of the current month.
 */
export function startOfMonth(date?: Date | string): Date {
  const d = date ? new Date(date) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Get the end of the current month.
 */
export function endOfMonth(date?: Date | string): Date {
  const d = date ? new Date(date) : new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Add days to a date.
 */
export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add hours to a date.
 */
export function addHours(date: Date | string, hours: number): Date {
  const d = new Date(date);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
}
