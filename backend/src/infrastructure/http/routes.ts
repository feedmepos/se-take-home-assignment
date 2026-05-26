import { Router, Request, Response, NextFunction } from 'express';
import type { OrderService } from '../../application/service/OrderService.js';
import type { BotService } from '../../application/service/BotService.js';
import { logger } from '../logger.js';

export function createRouter(orderService: OrderService, botService: BotService): Router {
  const router = Router();

  router.post('/api/orders', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      if (type !== 'VIP' && type !== 'NORMAL') {
        logger.warn('Invalid order type', { type });
        res.status(400).json({ error: 'type must be VIP or NORMAL' });
        return;
      }
      const order = orderService.createOrder(type);
      logger.info('Order created', { orderId: order.id, type });
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/orders', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = orderService.getOrders();
      res.json(orders);
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/bots', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const bot = botService.addBot();
      logger.info('Bot added', { botId: bot.id });
      res.status(201).json(bot);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/api/bots', (_req: Request, res: Response, next: NextFunction) => {
    try {
      botService.removeBot();
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/bots', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const bots = botService.getBots();
      res.json(bots);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
