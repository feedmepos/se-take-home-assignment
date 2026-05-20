import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CliService } from './cli/cli.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const cli = app.get(CliService);
  await cli.run();

  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
