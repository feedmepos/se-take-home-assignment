import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { OrderManager } from './orderManager.js';
import { sseManager } from './sse.js';
import { logger } from './utils/logger.js';
import {
  apiLimiter,
  orderLimiter,
  botLimiter,
  stateLimiter,
} from './middleware/index.js';
import {
  createOrderRoutes,
  createBotRoutes,
  createStateRoutes,
  createEventsRoutes,
} from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const orderManager = new OrderManager();

// Set up SSE broadcast callback
orderManager.setStateChangeCallback((state) => {
  sseManager.broadcast(state);
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client build
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Apply general rate limiter to all API routes
app.use('/api', apiLimiter);

// Routes
app.use('/api/orders', orderLimiter, createOrderRoutes(orderManager));
app.use('/api/bots', botLimiter, createBotRoutes(orderManager));
app.use('/api/state', stateLimiter, createStateRoutes(orderManager));
app.use('/api/events', createEventsRoutes(orderManager));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled error', { message: err.message, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
);

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('McDonald\'s Order Management System started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    sseManager.closeAll();
    logger.saveToFile();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    sseManager.closeAll();
    logger.saveToFile();
    process.exit(0);
  });
});

// Save logs on exit
process.on('exit', () => {
  logger.saveToFile();
});
