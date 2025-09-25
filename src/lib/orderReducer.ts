import { Order, Bot, AppState, AppAction } from '@/types';

export const UX_CONFIG = {
  MAX_BOTS: 5,
  MAX_ORDERS_PER_STATUS: 15,
} as const;

export const initialState: AppState = {
  orders: [],
  bots: [],
  nextOrderId: 1,
  nextBotId: 1,
};

export function orderReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CREATE_ORDER': {
      const { orderType, items } = action.payload;
      
      const total = items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
      
      const newOrder: Order = {
        id: state.nextOrderId,
        type: orderType,
        items,
        total,
        status: 'pending',
        createdAt: new Date(),
      };

      const orders = orderType === 'vip'
        ? [...state.orders.filter(o => o.type === 'vip'), newOrder, ...state.orders.filter(o => o.type === 'normal')]
        : [...state.orders, newOrder];

      return {
        ...state,
        orders,
        nextOrderId: state.nextOrderId + 1,
      };
    }

    case 'ADD_BOT': {
      if (state.bots.length >= UX_CONFIG.MAX_BOTS) {
        return state;
      }

      const newBot: Bot = {
        id: state.nextBotId,
        status: 'idle',
      };

      return {
        ...state,
        bots: [...state.bots, newBot],
        nextBotId: state.nextBotId + 1,
      };
    }

    case 'REMOVE_BOT': {
      if (state.bots.length === 0) return state;

      const botToRemove = state.bots[state.bots.length - 1];

      return {
        ...state,
        bots: state.bots.slice(0, -1),
        orders: state.orders.map(order =>
          order.status === 'processing' && order.processingBotId === botToRemove.id
            ? { 
                id: order.id, 
                type: order.type, 
                items: order.items,
                total: order.total,
                createdAt: order.createdAt, 
                status: 'pending' 
              }
            : order
        ),
      };
    }

    case 'START_PROCESSING': {
      const { orderId, botId } = action.payload;

      // Validate that the order is pending and bot is idle
      const order = state.orders.find(o => o.id === orderId);
      const bot = state.bots.find(b => b.id === botId);

      // Only start processing if order is pending and bot is idle
      if (order?.status === 'pending' && bot?.status === 'idle') {

        return {
          ...state,
          orders: state.orders.map(order =>
            order.id === orderId
              ? { ...order, status: 'processing', processingBotId: botId, processingStartedAt: new Date() }
              : order
          ),
          bots: state.bots.map(bot =>
            bot.id === botId
              ? { ...bot, status: 'processing', currentOrderId: orderId }
              : bot
          ),
        };
      }

      // If validation fails, don't change anything
      return state;
    }

    case 'COMPLETE_ORDER': {
      const { orderId, botId } = action.payload;

      // Validate that the order is still being processed by this bot
      const order = state.orders.find(o => o.id === orderId);
      const bot = state.bots.find(b => b.id === botId);

      // Only complete if order is still processing and bot still exists and is processing this order
      if (order?.status === 'processing' &&
        order.processingBotId === botId &&
        bot?.status === 'processing' &&
        bot.currentOrderId === orderId) {

        return {
          ...state,
          orders: state.orders.map(order =>
            order.id === orderId && order.status === 'processing'
              ? { ...order, status: 'complete', completedAt: new Date() }
              : order
          ),
          bots: state.bots.map(bot =>
            bot.id === botId
              ? { id: bot.id, status: 'idle' }
              : bot
          ),
        };
      }

      return state;
    }

    case 'RESET_ORDER_TO_PENDING': {
      const { orderId } = action.payload;

      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === orderId
            ? { 
                id: order.id, 
                type: order.type, 
                items: order.items,
                total: order.total,
                createdAt: order.createdAt, 
                status: 'pending' 
              }
            : order
        ),
      };
    }

    default:
      return state;
  }
}