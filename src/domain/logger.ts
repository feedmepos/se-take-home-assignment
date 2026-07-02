export function formatTimestamp(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export type Logger = (message: string) => void;

export function createTimestampedLogger(
  log: (line: string) => void = (line) => console.log(line),
): Logger {
  return (message: string) => log(`[${formatTimestamp()}] ${message}`);
}
