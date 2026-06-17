/** Formats an epoch-ms timestamp as zero-padded UTC "HH:MM:SS". */
export function formatClock(epochMs: number): string {
  const date = new Date(epochMs);
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
