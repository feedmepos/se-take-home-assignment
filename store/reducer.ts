import type { Action } from './actions';
import type { AppState, Order } from '../types';

export const initialState: AppState = {
  orders: [],
  bots: [],
  orderCounter: 0,
  botCounter: 0,
};

function comparePendingOrders(left: Order, right: Order): number {
  if (left.type !== right.type) {
    return left.type === 'vip' ? -1 : 1;
  }

  if (left.createdAt !== right.createdAt) {
    return left.createdAt - right.createdAt;
  }

  return left.id - right.id;
}

function insertPendingOrder(orders: Order[], order: Order): Order[] {
  let insertIndex = orders.length;

  for (let index = 0; index < orders.length; index += 1) {
    const currentOrder = orders[index];

    if (currentOrder.status !== 'pending') {
      continue;
    }

    if (comparePendingOrders(currentOrder, order) > 0) {
      insertIndex = index;
      break;
    }
  }

  return [...orders.slice(0, insertIndex), order, ...orders.slice(insertIndex)];
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_ORDER': {
      const nextOrder: Order = {
        id: state.orderCounter + 1,
        type: action.payload.isVip ? 'vip' : 'normal',
        status: 'pending',
        createdAt: Date.now(),
      };

      return {
        ...state,
        orders: insertPendingOrder(state.orders, nextOrder),
        orderCounter: nextOrder.id,
      };
    }

    case 'ASSIGN_ORDER': {
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.payload.orderId ? { ...order, status: 'processing' } : order,
        ),
        bots: state.bots.map((bot) =>
          bot.id === action.payload.botId
            ? { ...bot, status: 'processing', currentOrderId: action.payload.orderId }
            : bot,
        ),
      };
    }

    case 'COMPLETE_ORDER': {
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.payload.orderId ? { ...order, status: 'complete' } : order,
        ),
        bots: state.bots.map((bot) =>
          bot.id === action.payload.botId ? { ...bot, status: 'idle', currentOrderId: null } : bot,
        ),
      };
    }

    case 'ADD_BOT': {
      const nextBot = {
        id: state.botCounter + 1,
        status: 'idle' as const,
        currentOrderId: null,
      };

      return {
        ...state,
        bots: [...state.bots, nextBot],
        botCounter: nextBot.id,
      };
    }

    case 'REMOVE_BOT': {
      if (state.bots.length === 0) {
        return state;
      }

      const newestBot = state.bots.reduce((currentNewest, bot) =>
        bot.id > currentNewest.id ? bot : currentNewest,
      );

      const remainingBots = state.bots.filter((bot) => bot.id !== newestBot.id);

      if (newestBot.currentOrderId === null) {
        return {
          ...state,
          bots: remainingBots,
        };
      }

      const processingOrder = state.orders.find((order) => order.id === newestBot.currentOrderId);

      if (!processingOrder) {
        return {
          ...state,
          bots: remainingBots,
        };
      }

      const returnedOrder: Order = {
        ...processingOrder,
        status: 'pending',
      };
      const ordersWithoutProcessingOrder = state.orders.filter(
        (order) => order.id !== returnedOrder.id,
      );

      return {
        ...state,
        orders: insertPendingOrder(ordersWithoutProcessingOrder, returnedOrder),
        bots: remainingBots,
      };
    }

    default:
      return state;
  }
}
