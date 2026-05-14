import { Router } from 'express';
import { OrderManager } from '../orderManager.js';
import { sseManager } from '../sse.js';

export function createStateRoutes(orderManager: OrderManager): Router {
  const router = Router();

  // Get current state
  router.get('/', (req, res) => {
    try {
      res.json(orderManager.getState());
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch state' });
    }
  });

  // Reset system
  router.post('/reset', (req, res) => {
    try {
      orderManager.clearAll();
      const state = orderManager.getState();
      sseManager.broadcast({
        orders: state.orders,
        bots: state.bots,
      });
      res.json({ message: 'System reset' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset system' });
    }
  });

  return router;
}
