import { Router } from 'express';
import { getOrderController } from '../services/OrderControllerSingleton.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
const orderController = getOrderController();
// Initialize system
router.post('/init', authenticateToken, (req, res) => {
    orderController.log('System initialized with 0 bots');
    res.json({ message: 'System initialized' });
});
// Create normal order
router.post('/orders/normal', authenticateToken, (req, res) => {
    const order = orderController.createNormalOrder();
    res.status(201).json(order.toJSON());
});
// Create VIP order
router.post('/orders/vip', authenticateToken, (req, res) => {
    const order = orderController.createVIPOrder();
    res.status(201).json(order.toJSON());
});
// Get all orders
router.get('/orders', authenticateToken, (req, res) => {
    const orders = orderController.getAllOrders();
    res.json(orders.map(o => o.toJSON()));
});
// Get status
router.get('/status', authenticateToken, (req, res) => {
    const status = orderController.getStatus();
    const orders = orderController.getAllOrders();
    const vipCount = orders.filter(o => o.type === 'VIP').length;
    const normalCount = orders.filter(o => o.type === 'NORMAL').length;
    res.json({
        ...status,
        orders: {
            ...status.orders,
            vipCount,
            normalCount,
            list: orders.map(o => o.toJSON())
        },
        bots: {
            ...status.bots,
            list: orderController.getAllBots().map(b => b.toJSON())
        }
    });
});
export default router;
//# sourceMappingURL=orders.js.map