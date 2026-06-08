/** 把毫秒时间戳格式化为本地 HH:MM:SS。 */
export function formatClockTime(wallMs: number): string {
  const d = new Date(wallMs);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
