/**
 * Input sanitization utilities for OCR text and user-entered content.
 * Prevents XSS attacks from malicious OCR output or user input.
 */

/**
 * Escapes HTML special characters to prevent XSS.
 * Converts <, >, &, ", ' to their HTML entity equivalents.
 */
export function escapeHTML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Strips any HTML tags from a string.
 * Used for OCR output that might contain garbled HTML-like text.
 */
export function stripHTML(str: string): string {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitizes a string for safe display.
 * Removes HTML tags, trims whitespace, and limits length.
 */
export function sanitizeText(str: string, maxLength: number = 500): string {
  if (!str) return '';
  return stripHTML(str).trim().slice(0, maxLength);
}

/**
 * Sanitizes a subject name from OCR output.
 * Removes dangerous characters while preserving useful text.
 */
export function sanitizeSubjectName(name: string): string {
  if (!name) return '';
  return stripHTML(name)
    .trim()
    .replace(/[<>{}]/g, '')
    .slice(0, 200);
}

/**
 * Sanitizes a subject code from OCR output.
 * Only allows alphanumeric characters, hyphens, and dots.
 */
export function sanitizeSubjectCode(code: string): string {
  if (!code) return '';
  return code.replace(/[^a-zA-Z0-9.\-]/g, '').toUpperCase().slice(0, 30);
}

/**
 * Validates and clamps a numeric value.
 * Returns 0 if the value is not a valid number.
 */
export function sanitizeNumber(value: unknown, min: number = 0, max: number = 9999): number {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.max(min, Math.min(max, Math.round(num)));
}

/**
 * Validates file type against allowed MIME types.
 */
export function validateFileType(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.type)) return true;

  // Fallback: check extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
}

/**
 * Validates file size (in bytes).
 * Default limit: 20MB
 */
export function validateFileSize(file: File, maxSizeMB: number = 20): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

/**
 * Validates a month string format (e.g., "Jun-2026").
 */
export function isValidMonthFormat(month: string): boolean {
  return /^[A-Za-z]{3}-\d{4}$/.test(month.trim());
}

/**
 * Returns a safe display string, or a fallback if empty.
 */
export function safeDisplay(value: string | null | undefined, fallback: string = '—'): string {
  if (!value || !value.trim()) return fallback;
  return sanitizeText(value, 200) || fallback;
}
