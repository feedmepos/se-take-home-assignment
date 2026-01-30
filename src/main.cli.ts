import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SimulationService } from './simulation/simulation.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const simulation = app.get(SimulationService);

  try {
    await simulation.run();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Simulation failed', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();

