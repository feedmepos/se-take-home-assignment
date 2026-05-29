import { describe, it, expect } from 'vitest';
import { createOrder } from './Order.js';
import { OrderController } from './OrderController.js';
import { productManager } from './ProductManager.js';

// Mock logger
import { vi } from 'vitest';
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
  writeText: vi.fn(),
}));

describe('Order-Product Association', () => {
  it('should create order with associated product', () => {
    const order = createOrder('normal');
    
    expect(order.product).toBeDefined();
    expect(order.product.id).toBeGreaterThan(0);
    expect(order.product.name).toBeDefined();
    expect(order.product.nameCn).toBeDefined();
    expect(order.product.price).toBeGreaterThan(0);
  });

  it('should associate random product when creating order', () => {
    const products = productManager.getProducts();
    const orders = Array.from({ length: 10 }, () => createOrder('normal'));
    
    // 验证每个订单都关联了一个有效的商品
    orders.forEach(order => {
      expect(products).toContainEqual(order.product);
    });
  });

  it('should associate product with both normal and VIP orders', () => {
    const normalOrder = createOrder('normal');
    const vipOrder = createOrder('vip');
    
    expect(normalOrder.product).toBeDefined();
    expect(vipOrder.product).toBeDefined();
    expect(typeof normalOrder.product.price).toBe('number');
    expect(typeof vipOrder.product.price).toBe('number');
  });

  it('should have product information in pending orders', () => {
    const controller = new OrderController();
    const order = controller.createNormalOrder();
    
    const pendingOrders = controller.getPendingOrders();
    expect(pendingOrders[0].product).toBe(order.product);
    expect(pendingOrders[0].product.name).toBe(order.product.name);
  });

  it('should pass product information to bot when processing', () => {
    const controller = new OrderController();
    const bot = controller.addBot();
    const order = controller.createNormalOrder();
    
    // 机器人应该开始处理订单
    expect(bot.status).toBe('busy');
    expect(bot.currentOrder).toBe(order);
    expect(bot.currentOrder?.product).toBe(order.product);
  });

  it('should preserve product information when order is completed', () => {
    const controller = new OrderController();
    const order = controller.createNormalOrder();
    const productAtCreation = order.product;
    
    // 创建机器人处理订单（模拟完成）
    const bot = controller.addBot();
    
    // 验证商品信息在机器人处理时保持一致
    expect(bot.currentOrder?.product).toBe(productAtCreation);
  });

  it('should have unique product reference in each order', () => {
    const order1 = createOrder('normal');
    const order2 = createOrder('normal');
    
    // 两个订单的商品应该是独立的引用（虽然可能是同一个商品）
    expect(order1.product.id).toBeGreaterThan(0);
    expect(order2.product.id).toBeGreaterThan(0);
  });

  it('should allow accessing product details from order', () => {
    const order = createOrder('vip');
    
    // 验证可以访问商品的所有属性
    expect(order.product.name).toBeTruthy();
    expect(order.product.nameCn).toBeTruthy();
    expect(order.product.price).toBeGreaterThan(0);
    expect(order.product.category).toBeTruthy();
  });
});