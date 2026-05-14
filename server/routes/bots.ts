import { Router } from 'express';
import { OrderManager } from '../orderManager.js';
import { sseManager } from '../sse.js';

export function createBotRoutes(orderManager: OrderManager): Router {
  const router = Router();

  // Helper to broadcast changes
  const broadcastStateChange = () => {
    const state = orderManager.getState();
    sseManager.broadcast({
      orders: state.orders,
      bots: state.bots,
    });
  };

  // Create bot
  router.post('/', (req, res) => {
    try {
      const bot = orderManager.createBot();
      broadcastStateChange();
      res.json(bot);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create bot' });
    }
  });

  // Remove bot
  router.delete('/', (req, res) => {
    try {
      const bot = orderManager.removeBot();
      if (bot) {
        broadcastStateChange();
        res.json(bot);
      } else {
        res.status(400).json({ error: 'No bots available' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove bot' });
    }
  });

  return router;
}
