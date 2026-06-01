const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 时间戳 → HH:MM:SS。 */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
