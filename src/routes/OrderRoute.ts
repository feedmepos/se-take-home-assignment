import { Router } from 'express';

// Middlewares
import { isAuthenticated } from '../middlewares/authentication';
import { validate, validators } from '../middlewares/routeValidator';

// Controllers
import OrderController from '../controllers/OrderController';

// Create the router instance
const router = Router();
const orderController = new OrderController();

// Retrieve order info
router.get(
  '/orders',
  isAuthenticated,
  orderController.getOrders
);

// Retrieve order info
router.get(
  '/order',
  isAuthenticated,
  orderController.getOrder
);

// Create order profile
router.post(
  '/order',
  isAuthenticated,
  validate(validators.createOrderValidator),
  orderController.createOrder
);

// Update order info
router.put(
  '/order',
  isAuthenticated,
  validate(validators.updateOrderValidator),
  orderController.updateOrder
);

// Update order info
router.post(
  '/order/assign',
  isAuthenticated,
  orderController.assignOrder
);

export default router;
