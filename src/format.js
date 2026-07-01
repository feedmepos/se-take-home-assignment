'use strict';

/** Format a Date as HH:MM:SS (zero-padded), as required by the assignment. */
function formatTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = { formatTime };
