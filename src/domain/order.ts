import { Order, ORDER_STATUS, OrderStatus, OrderType } from "./types";

export function createOrder(
  id: number,
  type: OrderType,
  createdAt: number
): Order {
  return {
    id,
    type,
    status: ORDER_STATUS.PENDING,
    createdAt,
    startedAt: null,
    completedAt: null,
  };
}

export function markPending(order: Order): void {
  setOrderStatus(order, ORDER_STATUS.PENDING, { startedAt: null, completedAt: null });
}

export function markProcessing(order: Order, startedAt: number): void {
  setOrderStatus(order, ORDER_STATUS.PROCESSING, { startedAt, completedAt: null });
}

export function markComplete(order: Order, completedAt: number): void {
  setOrderStatus(order, ORDER_STATUS.COMPLETE, { completedAt });
}

export function getProcessingDuration(order: Order, completedAt: number): number {
  if (order.startedAt == null) {
    return 0;
  }
  return completedAt - order.startedAt;
}

function setOrderStatus(
  order: Order,
  status: OrderStatus,
  timestamps: { startedAt?: number | null; completedAt?: number | null } = {}
): void {
  order.status = status;
  if ("startedAt" in timestamps) {
    order.startedAt = timestamps.startedAt ?? null;
  }
  if ("completedAt" in timestamps) {
    order.completedAt = timestamps.completedAt ?? null;
  }
}
