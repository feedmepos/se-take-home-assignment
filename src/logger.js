function formatTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function createLogger(onLine) {
  const lines = [];

  function log(message, date = new Date()) {
    const line = `[${formatTime(date)}] ${message}`;
    lines.push(line);
    if (onLine) {
      onLine(line);
    }
    return line;
  }

  return { log, lines, formatTime };
}

module.exports = { createLogger, formatTime };
