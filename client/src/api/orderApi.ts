import { Order, CreateOrderResponse } from '../types';

const API_BASE = '/api';

export const orderApi = {
  createNormalOrder: async (): Promise<Order> => {
    const response = await fetch(`${API_BASE}/orders/normal`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to create normal order');
    const data: CreateOrderResponse = await response.json();
    return data.order;
  },

  createVipOrder: async (): Promise<Order> => {
    const response = await fetch(`${API_BASE}/orders/vip`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to create VIP order');
    const data: CreateOrderResponse = await response.json();
    return data.order;
  },
};
