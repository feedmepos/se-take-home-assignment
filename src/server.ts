import express, { Application } from 'express';
import { OrderService } from './services/order.service';
import { BotService } from './services/bot.service';
import { OrderController } from './controllers/order.controller';
import { BotController } from './controllers/bot.controller';

export function createServer(): Application {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize services
  const orderService = new OrderService();
  const botService = new BotService(orderService);

  // Initialize controllers
  const orderController = new OrderController(orderService);
  const botController = new BotController(botService);

  // Order routes
  app.post('/orders/normal', orderController.createNormalOrder);
  app.post('/orders/vip', orderController.createVipOrder);
  app.get('/orders', orderController.getAllOrders);

  // Bot routes
  app.post('/bots', botController.addBot);
  app.delete('/bots', botController.removeBot);
  app.get('/bots', botController.getAllBots);

  // Status route
  app.get('/status', (req, res) => {
    try {
      const orders = orderService.getAllOrders();
      const bots = botService.getBots();

      res.status(200).json({
        success: true,
        data: {
          orders: {
            pending: orders.pending.length,
            processing: orders.processing.length,
            completed: orders.completed.length,
          },
          bots: {
            total: bots.length,
            active: botService.getActiveBotCount(),
            idle: botService.getIdleBotCount(),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Root endpoint with API documentation
  app.get('/', (req, res) => {
    res.status(200).json({
      message: "McDonald's Order Management System API",
      endpoints: {
        orders: {
          'POST /orders/normal': 'Create a new normal order',
          'POST /orders/vip': 'Create a new VIP order',
          'GET /orders': 'Get all orders grouped by status'
        },
        bots: {
          'POST /bots': 'Add a new bot',
          'DELETE /bots': 'Remove the newest bot',
          'GET /bots': 'Get all bots and their status'
        },
        status: {
          'GET /status': 'Get system status summary',
          'GET /health': 'Health check endpoint'
        }
      }
    });
  });

  return app;
}

export function startServer(port: number = 3000): void {
  const app = createServer();

  app.listen(port, () => {
    console.log(`\n🍔 McDonald's Order Management System`);
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📖 API Documentation: http://localhost:${port}/`);
    console.log(`\n📝 Example commands:`);
    console.log(`   curl -X POST http://localhost:${port}/orders/normal`);
    console.log(`   curl -X POST http://localhost:${port}/orders/vip`);
    console.log(`   curl -X POST http://localhost:${port}/bots`);
    console.log(`   curl -X DELETE http://localhost:${port}/bots`);
    console.log(`   curl http://localhost:${port}/status\n`);
  });
}
