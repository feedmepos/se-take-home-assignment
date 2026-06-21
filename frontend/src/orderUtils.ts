import type { Order } from './types';

export function insertToPendingQueue(
  pendingIds: number[],
  orders: Record<number, Order>,
  newOrderId: number,
): number[] {
  const newOrder = orders[newOrderId];
  if (!newOrder.isVip) {
    return [...pendingIds, newOrderId]; // 普通订单直接插入到队尾
  }

  const firstNormalIndex = pendingIds.findIndex((id) => !orders[id]?.isVip);
  if (firstNormalIndex === -1) {
    return [...pendingIds, newOrderId];
  }

  return [
    ...pendingIds.slice(0, firstNormalIndex), // 这部分是 vip 订单
    newOrderId, // 这个是新订单（vip 订单）
    ...pendingIds.slice(firstNormalIndex), // 这部分是普通订单
  ];
}
