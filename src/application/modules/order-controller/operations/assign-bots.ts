import { BotStatus, OrderStatus, sortByPriority } from '@/domain';
import { ControllerState } from '../state';

/**
 * Reconcile idle bots with the pending queue
 */
export function assignBots(state: ControllerState): ControllerState {
  const pending = sortByPriority(
    state.orders.filter((order) => order.status === OrderStatus.PENDING),
  );
  const idleBots = state.bots
    .filter((bot) => bot.status === BotStatus.IDLE)
    .sort((a, b) => a.id - b.id);

  const pairs = Math.min(pending.length, idleBots.length);
  if (pairs === 0) return state;

  const orderByBot = new Map<number, number>();
  for (let i = 0; i < pairs; i += 1) {
    orderByBot.set(idleBots[i].id, pending[i].id);
  }
  const assignedOrderIds = new Set(orderByBot.values());

  const bots = state.bots.map((bot) => {
    const orderId = orderByBot.get(bot.id);
    return orderId === undefined
      ? bot
      : { ...bot, status: BotStatus.PROCESSING, currentOrderId: orderId };
  });
  const orders = state.orders.map((order) =>
    assignedOrderIds.has(order.id)
      ? { ...order, status: OrderStatus.PROCESSING }
      : order,
  );

  return { ...state, bots, orders };
}
