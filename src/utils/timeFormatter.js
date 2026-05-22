/**
 * Formats a Date object to HH:MM:SS format
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string (HH:MM:SS)
 */
export function formatTime(date) {
  return date.toTimeString().slice(0, 8);
}

/**
 * Gets the current time formatted as HH:MM:SS
 * @returns {string} Current time in HH:MM:SS format
 */
export function getCurrentTime() {
  return formatTime(new Date());
}
