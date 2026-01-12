import { OrderController } from './OrderController.js';

// Singleton instance to share across routes
let instance: OrderController | null = null;

export const getOrderController = (): OrderController => {
  if (!instance) {
    instance = new OrderController();
  }
  return instance;
};

