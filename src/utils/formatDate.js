/**
 * Format a date consistently across the application
 * @param {Date} date - The date to format (defaults to current date)
 * @returns {string} Formatted date string like "02 Jun 2026, 3:45 PM"
 */
export function formatDateTime(date = new Date()) {
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
