import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { CliController } from './controllers/cli.controller';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

async function startHttpApi() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend integration
  app.enableCors();
  
  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false, // Allow extra fields but strip them
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('McDonald\'s Order Management System API')
    .setDescription('API for managing orders and bots in the McDonald\'s order system')
    .setVersion('1.0')
    .addTag('orders', 'Order management operations')
    .addTag('bots', 'Bot management operations')
    .addTag('maintenance', 'System maintenance operations')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/orders - Create order`);
  console.log(`   POST /api/bots - Add bot`);
  console.log(`   DELETE /api/bots/latest - Remove latest bot`);
  console.log(`   GET /api/status - Get system status`);
  console.log(`   POST /api/maintenance/reset-stuck-orders - Reset stuck orders`);
  console.log(`   POST /api/maintenance/cleanup - Cleanup orphaned timeouts`);
  console.log(`   GET /api/maintenance/integrity - Validate system integrity`);
}

async function runCliSimulation() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cliController = app.get(CliController);

  // Clear result.txt file
  if (fs.existsSync('scripts/result.txt')) {
    fs.unlinkSync('scripts/result.txt');
  }

  // Run the simulation
  cliController.runSimulation();

  // Run edge case tests
  setTimeout(() => {
    cliController.runEdgeCaseTests();
  }, 2000);

  // Keep the application running for a while to let orders complete
  setTimeout(() => {
    cliController.getStatus();
    
    // Graceful shutdown with cleanup
    cliController.gracefulShutdown();
    
    // Close the application
    app.close();
  }, 15000); // Wait 15 seconds to see some orders complete
}

async function bootstrap() {
  // Check if we should run CLI simulation or start HTTP API
  const runMode = process.env.RUN_MODE || process.argv[2] || 'api';
  
  if (runMode === 'cli' || runMode === 'simulation') {
    console.log('🎮 Starting CLI Simulation Mode...');
    await runCliSimulation();
  } else {
    console.log('🌐 Starting HTTP API Mode...');
    await startHttpApi();
  }
}

bootstrap();
