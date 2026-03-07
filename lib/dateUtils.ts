/**
 * Centralized date formatting utilities.
 * Uses the browser's locale for consistent, localized date display.
 */

/**
 * Format a date as a short date string (e.g., "Jan 15, 2024" in en-US)
 * Returns '-' for null/undefined values.
 */
export function formatDate(date: string | Date | null | undefined, fallback = '-'): string {
  if (!date) return fallback;
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date as a date + time string (e.g., "Jan 15, 2024, 2:30 PM" in en-US)
 * Returns '-' for null/undefined values.
 */
export function formatDateTime(date: string | Date | null | undefined, fallback = '-'): string {
  if (!date) return fallback;
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a date as time only (e.g., "2:30 PM" in en-US)
 * Returns '-' for null/undefined values.
 */
export function formatTime(date: string | Date | null | undefined, fallback = '-'): string {
  if (!date) return fallback;
  return new Date(date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
