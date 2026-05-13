import { Router } from 'express';
import { OrderManager } from '../orderManager.js';
import { sseManager } from '../sse.js';

export function createOrderRoutes(orderManager: OrderManager): Router {
  const router = Router();

  // Helper to broadcast changes
  const broadcastStateChange = () => {
    const state = orderManager.getState();
    sseManager.broadcast({
      orders: state.orders,
      bots: state.bots,
    });
  };

  // Create normal order
  router.post('/normal', (req, res) => {
    try {
      const order = orderManager.createOrder('NORMAL');
      broadcastStateChange();
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create normal order' });
    }
  });

  // Create VIP order
  router.post('/vip', (req, res) => {
    try {
      const order = orderManager.createOrder('VIP');
      broadcastStateChange();
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create VIP order' });
    }
  });

  return router;
}
