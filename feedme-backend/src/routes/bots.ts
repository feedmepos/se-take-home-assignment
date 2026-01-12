import { Router, Response } from 'express';
import { getOrderController } from '../services/OrderControllerSingleton.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
const orderController = getOrderController();

// Add bot
router.post('/bots', authenticateToken, (req: AuthRequest, res: Response) => {
  const bot = orderController.addBot();
  res.status(201).json(bot.toJSON());
});

// Remove bot
router.delete('/bots', authenticateToken, (req: AuthRequest, res: Response) => {
  const bot = orderController.removeBot();
  if (bot) {
    res.json(bot.toJSON());
  } else {
    res.status(404).json({ error: 'No bots available to remove' });
  }
});

// Get all bots
router.get('/bots', authenticateToken, (req: AuthRequest, res: Response) => {
  const bots = orderController.getAllBots();
  res.json(bots.map(b => b.toJSON()));
});

export default router;

