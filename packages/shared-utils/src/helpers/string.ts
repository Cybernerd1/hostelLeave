/**
 * String Utility Functions
 *
 * Shared string manipulation helpers.
 */

/**
 * Generate a unique leave ID.
 * Format: LV-YYYYMMDD-XXXXX (e.g., LV-20250722-A3F8K)
 */
export function generateLeaveId(): string {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');
  const randomStr = generateRandomString(5).toUpperCase();
  return `LV-${dateStr}-${randomStr}`;
}

/**
 * Generate a random alphanumeric string.
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Slugify a string (e.g., "Computer Science" => "computer-science").
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Capitalize the first letter of each word.
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Sanitize a string by removing HTML tags and trimming.
 */
export function sanitize(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, '')
    .trim();
}

/**
 * Mask an email address (e.g., "john@example.com" => "j***@example.com").
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return email;
  }
  const maskedLocal =
    localPart.charAt(0) + '*'.repeat(Math.max(localPart.length - 1, 3));
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask a phone number (e.g., "9876543210" => "98****3210").
 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) {
    return phone;
  }
  return phone.slice(0, 2) + '****' + phone.slice(-4);
}

/**
 * Format a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from a filename.
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : '';
}

/**
 * Generate a unique filename for uploads.
 */
export function generateUploadFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const random = generateRandomString(8);
  return `${timestamp}-${random}${ext}`;
}
