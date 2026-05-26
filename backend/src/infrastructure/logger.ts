type Level = 'INFO' | 'WARN' | 'ERROR';

function fmt(level: Level, msg: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level}] ${msg}`;
  if (meta) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>): void {
    console.log(fmt('INFO', msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>): void {
    console.warn(fmt('WARN', msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>): void {
    console.error(fmt('ERROR', msg, meta));
  },
};
