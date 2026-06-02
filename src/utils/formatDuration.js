/**
 * Convert nanoseconds to milliseconds and format for display
 * @param {number} nanoseconds - Duration in nanoseconds
 * @returns {string} Formatted duration in milliseconds (e.g., "1.23")
 */
export function formatDuration(nanoseconds) {
  if (nanoseconds === undefined || nanoseconds === null) {
    return null;
  }
  
  const milliseconds = nanoseconds / 1000000;
  
  // Round to 2 decimal places
  return milliseconds.toFixed(2);
}
