import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { OrderProcessingEngine } from './domain/service/OrderProcessingEngine.js';
import { OrderService } from './application/service/OrderService.js';
import { BotService } from './application/service/BotService.js';
import { createHealthRouter } from './infrastructure/http/health.js';
import { createRouter } from './infrastructure/http/routes.js';
import { WebSocketManager } from './infrastructure/ws/WebSocketManager.js';
import { logger } from './infrastructure/logger.js';

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app: express.Express = express();
app.use(createHealthRouter());
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

const engine = new OrderProcessingEngine();
const orderService = new OrderService(engine);
const botService = new BotService(engine);

app.use(createRouter(orderService, botService));

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled request error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const server = createServer(app);

const wsManager = new WebSocketManager();
wsManager.attach(server, engine);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info('Server started', { port: Number(PORT) });
});

// Graceful shutdown
function shutdown(signal: string): void {
  logger.info('Shutting down', { signal });
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
  });
});

export { app, engine, orderService, botService };
