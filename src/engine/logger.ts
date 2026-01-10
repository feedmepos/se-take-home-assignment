import type { Clock } from "./clock";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatHHMMSS(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export type LogFn = (message: string) => void;

/**
 * Creates a logger that prints `[HH:MM:SS] <message>` to stdout.
 * Since run.sh redirects stdout to result.txt, this becomes the content of result.txt.
 */
export function createLogger(clock: Clock): LogFn {
  return (message: string) => {
    process.stdout.write(`[${formatHHMMSS(clock.nowMs())}] ${message}\n`);
  };
}
