import { useEffect, useReducer } from 'react';
import type { Order, Bot, OrderType } from '../types';

interface State {
  orders: Order[];
  bots: Bot[];
  nextOrderId: number;
  nextBotId: number;
}

type Action =
  | { type: 'ADD_ORDER'; payload: { orderType: OrderType } }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' }
  | { type: 'TICK'; payload: { now: number } };

const initialState: State = {
  orders: [],
  bots: [],
  nextOrderId: 1,
  nextBotId: 1,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ORDER': {
      const newOrder: Order = {
        id: state.nextOrderId,
        type: action.payload.orderType,
        status: 'PENDING',
        createdAt: Date.now(),
      };
      return {
        ...state,
        orders: [...state.orders, newOrder],
        nextOrderId: state.nextOrderId + 1,
      };
    }
    case 'ADD_BOT': {
      const newBot: Bot = {
        id: state.nextBotId,
        orderId: null,
        processingStartTime: null,
      };
      return {
        ...state,
        bots: [...state.bots, newBot],
        nextBotId: state.nextBotId + 1,
      };
    }
    case 'REMOVE_BOT': {
      if (state.bots.length === 0) return state;
      
      // Remove newest bot
      const newBots = [...state.bots];
      const removedBot = newBots.pop()!;
      
      const newOrders = [...state.orders];
      if (removedBot.orderId !== null) {
        // Return order to PENDING
        const order = newOrders.find((o) => o.id === removedBot.orderId);
        if (order) {
          order.status = 'PENDING';
        }
      }
      return {
        ...state,
        bots: newBots,
        orders: newOrders,
      };
    }
    case 'TICK': {
      const { now } = action.payload;
      let stateChanged = false;
      
      const nextBots = state.bots.map(b => ({...b}));
      const nextOrders = state.orders.map(o => ({...o}));

      // 1. Process completions
      nextBots.forEach((bot) => {
        if (bot.orderId !== null && bot.processingStartTime !== null) {
          // 10 seconds processing time
          if (now - bot.processingStartTime >= 10000) {
            const order = nextOrders.find((o) => o.id === bot.orderId);
            if (order) {
              order.status = 'COMPLETE';
              order.completedAt = now;
            }
            bot.orderId = null;
            bot.processingStartTime = null;
            stateChanged = true;
          }
        }
      });

      // 2. Assign idle bots
      const pendingOrders = nextOrders
        .filter((o) => o.status === 'PENDING')
        .sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'VIP' ? -1 : 1;
          }
          return a.id - b.id;
        });

      let pendingIndex = 0;
      nextBots.forEach((bot) => {
        if (bot.orderId === null && pendingIndex < pendingOrders.length) {
          const order = pendingOrders[pendingIndex];
          order.status = 'PROCESSING';
          
          bot.orderId = order.id;
          bot.processingStartTime = now;
          pendingIndex++;
          stateChanged = true;
        }
      });

      if (stateChanged) {
        return {
          ...state,
          bots: nextBots,
          orders: nextOrders,
        };
      }
      return state;
    }
    default:
      return state;
  }
}

export function useOrderManager() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // The Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK', payload: { now: Date.now() } });
    }, 500); // 500ms tick resolution for responsive UI

    return () => clearInterval(interval);
  }, []);

  const addOrder = (orderType: OrderType) => {
    dispatch({ type: 'ADD_ORDER', payload: { orderType } });
    // Immediate tick to start processing right away if a bot is idle
    setTimeout(() => dispatch({ type: 'TICK', payload: { now: Date.now() } }), 0);
  };

  const addBot = () => {
    dispatch({ type: 'ADD_BOT' });
    setTimeout(() => dispatch({ type: 'TICK', payload: { now: Date.now() } }), 0);
  };

  const removeBot = () => {
    dispatch({ type: 'REMOVE_BOT' });
    setTimeout(() => dispatch({ type: 'TICK', payload: { now: Date.now() } }), 0);
  };

  return {
    state,
    addOrder,
    addBot,
    removeBot,
  };
}
