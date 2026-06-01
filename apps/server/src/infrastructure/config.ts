export interface ServerConfig {
  port: number;
  host: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: Number(env.PORT ?? 3001),
    host: env.HOST ?? '0.0.0.0',
  };
}
