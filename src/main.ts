import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle("McDonald's Order Management System")
    .setDescription(
      'REST API for managing orders and cooking bots.\n\n' +
      '**Order priority rules**\n' +
      '- VIP orders are placed ahead of all Normal orders\n' +
      '- Multiple VIP orders queue among themselves (FIFO)\n' +
      '- Each bot processes one order at a time (10 seconds)\n' +
      '- Removing a bot returns its in-progress order to the correct queue position',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server   : http://localhost:${port}`);
  console.log(`Swagger  : http://localhost:${port}/docs`);
}

bootstrap().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
