import type { Product } from './Product.js';
import { productManager } from './ProductManager.js';

export type OrderType = 'normal' | 'vip';
export type OrderStatus = 'pending' | 'processing' | 'completed';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  product: Product;
  createdAt: Date;
  completedAt?: Date;
}

let nextOrderId = 1001;

export function createOrder(type: OrderType): Order {
  return {
    id: nextOrderId++,
    type,
    status: 'pending',
    product: productManager.getRandomProduct(),
    createdAt: new Date(),
  };
}

export function formatTimestamp(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
