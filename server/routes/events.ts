import { Router } from 'express';
import { OrderManager } from '../orderManager.js';
import { sseManager } from '../sse.js';

export function createEventsRoutes(orderManager: OrderManager): Router {
  const router = Router();

  // SSE endpoint for real-time updates
  router.get('/', (req, res) => {
    try {
      sseManager.addClient(res);
      // Send initial state
      const state = orderManager.getState();
      res.write(
        `data: ${JSON.stringify({
          type: 'initial-state',
          payload: { orders: state.orders, bots: state.bots },
        })}\n\n`
      );
    } catch (error) {
      res.status(500).json({ error: 'Failed to establish SSE connection' });
    }
  });

  return router;
}
