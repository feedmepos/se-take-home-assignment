import { loadConfig } from './infrastructure/config';
import { KitchenService } from './application/KitchenService';
import { buildApp } from './app';

async function main(): Promise<void> {
  const config = loadConfig();
  const service = new KitchenService(); // 生产用 RealClock(真实 10 秒)
  const app = await buildApp(service, { logger: true });

  await app.listen({ port: config.port, host: config.host });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
