import type { Order, OrderType } from '../types';

/**
 * 创建新订单
 * @param id 订单 ID
 * @param type 订单类型 (NORMAL | VIP)
 * @returns 新订单对象
 */
export const createOrder = (id: number, type: OrderType): Order => {
  return {
    id,
    type,
    status: 'PENDING',
    createdAt: Date.now(),
  };
};

/**
 * 对订单列表进行排序
 * VIP 订单优先于普通订单，同类型订单按创建时间排序
 * @param orders 订单列表
 * @returns 排序后的订单列表
 */
export const sortOrders = (orders: Order[]): Order[] => {
  return [...orders].sort((a, b) => {
    // 1. VIP 优先
    if (a.type === 'VIP' && b.type !== 'VIP') return -1;
    if (a.type !== 'VIP' && b.type === 'VIP') return 1;
    
    // 2. 被移回队列的订单优先 (requeuedAt)
    // 如果都有 requeuedAt，则按 requeuedAt 降序排列（最近移回的在最前面，或者按原 ID 保持顺序？）
    // 这里的“头部”通常指相对于普通未处理订单的头部
    if (a.requeuedAt && !b.requeuedAt) return -1;
    if (!a.requeuedAt && b.requeuedAt) return 1;
    if (a.requeuedAt && b.requeuedAt) {
      return b.requeuedAt - a.requeuedAt;
    }

    // 3. 同类型按 ID 排序（假设 ID 是递增的）
    return a.id - b.id;
  });
};
