import { BotStatus, createBot, createOrder, OrderStatus } from '@/domain';
import { ControllerAction } from './actions';
import { assignBots } from './operations/assign-bots';
import { ControllerState } from './state';

export function controllerReducer(
  state: ControllerState,
  action: ControllerAction,
): ControllerState {
  switch (action.type) {
    case 'CREATE_ORDER': {
      const order = createOrder(state.nextOrderId, action.orderType);
      return assignBots({
        ...state,
        orders: [...state.orders, order],
        nextOrderId: state.nextOrderId + 1,
      });
    }

    case 'ADD_BOT': {
      const bot = createBot(state.nextBotId);
      return assignBots({
        ...state,
        bots: [...state.bots, bot],
        nextBotId: state.nextBotId + 1,
      });
    }

    case 'REMOVE_BOT': {
      if (state.bots.length === 0) return state;

      // Destroy the newest bot (highest id)
      const newest = state.bots.reduce((a, b) => (b.id > a.id ? b : a));
      const bots = state.bots.filter((bot) => bot.id !== newest.id);

      // If it was mid-cook, return its order to PENDING. 
      const orders =
        newest.currentOrderId === null
          ? state.orders
          : state.orders.map((order) =>
              order.id === newest.currentOrderId
                ? { ...order, status: OrderStatus.PENDING }
                : order,
            );

      return assignBots({ ...state, bots, orders });
    }

    case 'COMPLETE_ORDER': {
      const bot = state.bots.find((candidate) => candidate.id === action.botId);
      if (!bot || bot.currentOrderId !== action.orderId) return state;

      const bots = state.bots.map((candidate) =>
        candidate.id === action.botId
          ? { ...candidate, status: BotStatus.IDLE, currentOrderId: null }
          : candidate,
      );
      const orders = state.orders.map((order) =>
        order.id === action.orderId
          ? {
              ...order,
              status: OrderStatus.COMPLETE,
              completedSeq: state.nextCompletionSeq,
            }
          : order,
      );

      return assignBots({
        ...state,
        bots,
        orders,
        nextCompletionSeq: state.nextCompletionSeq + 1,
      });
    }

    default:
      return state;
  }
}
