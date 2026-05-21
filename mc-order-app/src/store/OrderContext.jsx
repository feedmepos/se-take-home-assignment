import { createContext, useContext, useReducer, useRef, useEffect, useCallback } from 'react';

const PROCESSING_TIME_MS = 10000;
const MAX_LOGS = 200;

const OrderContext = createContext(null);

function buildLog(state, event, orderType, orderId, botId) {
  const messages = {
    ORDER_CREATED: () => `订单 #${orderId} (${orderType === 'vip' ? 'VIP' : 'Normal'}) 已创建`,
    ORDER_PROCESSING: () => `机器人 #${botId} 开始处理订单 #${orderId}`,
    ORDER_COMPLETED: () => `订单 #${orderId} 已完成，由机器人 #${botId} 处理`,
    ORDER_RETURNED: () => `订单 #${orderId} 退回 PENDING（机器人 #${botId} 已销毁）`,
    BOT_CREATED: () => `机器人 #${botId} 已上线`,
    BOT_DESTROYED: () => `机器人 #${botId} 已下线`,
  };
  const entry = {
    id: Date.now(),
    timestamp: new Date(),
    event,
    message: messages[event](),
  };
  const newLogs = [entry, ...state.logs];
  return newLogs.length > MAX_LOGS ? newLogs.slice(0, MAX_LOGS) : newLogs;
}

const initialState = {
  role: 'customer',
  vipQueue: [],
  normalQueue: [],
  completedOrders: [],
  bots: [],
  orderIdCounter: 0,
  botIdCounter: 0,
  logs: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.payload };

    case 'ADD_VIP_ORDER': {
      const order = {
        id: state.orderIdCounter + 1,
        type: 'vip',
        status: 'pending',
        createdAt: new Date(),
      };
      return {
        ...state,
        vipQueue: [...state.vipQueue, order],
        orderIdCounter: state.orderIdCounter + 1,
        logs: buildLog(state, 'ORDER_CREATED', 'vip', order.id),
      };
    }

    case 'ADD_NORMAL_ORDER': {
      const order = {
        id: state.orderIdCounter + 1,
        type: 'normal',
        status: 'pending',
        createdAt: new Date(),
      };
      return {
        ...state,
        normalQueue: [...state.normalQueue, order],
        orderIdCounter: state.orderIdCounter + 1,
        logs: buildLog(state, 'ORDER_CREATED', 'normal', order.id),
      };
    }

    case 'BOT_PICK_ORDER': {
      const { botId } = action.payload;
      if (state.vipQueue.length === 0 && state.normalQueue.length === 0) return state;

      let order, newVip, newNormal;
      if (state.vipQueue.length > 0) {
        [order, ...newVip] = state.vipQueue;
        newNormal = state.normalQueue;
      } else {
        [order, ...newNormal] = state.normalQueue;
        newVip = state.vipQueue;
      }

      const updatedOrder = { ...order, status: 'processing' };
      return {
        ...state,
        vipQueue: newVip,
        normalQueue: newNormal,
        bots: state.bots.map(b =>
          b.id === botId
            ? { ...b, status: 'processing', currentOrder: updatedOrder }
            : b
        ),
        logs: buildLog(state, 'ORDER_PROCESSING', order.type, order.id, botId),
      };
    }

    case 'COMPLETE_ORDER': {
      const { botId } = action.payload;
      const bot = state.bots.find(b => b.id === botId);
      if (!bot || !bot.currentOrder) return state;

      const completed = { ...bot.currentOrder, status: 'completed' };
      return {
        ...state,
        completedOrders: [...state.completedOrders, completed],
        bots: state.bots.map(b =>
          b.id === botId ? { ...b, status: 'idle', currentOrder: null } : b
        ),
        logs: buildLog(state, 'ORDER_COMPLETED', completed.type, completed.id, botId),
      };
    }

    case 'ADD_BOT': {
      const newBot = {
        id: state.botIdCounter + 1,
        status: 'idle',
        currentOrder: null,
      };
      return {
        ...state,
        bots: [...state.bots, newBot],
        botIdCounter: state.botIdCounter + 1,
        logs: buildLog(state, 'BOT_CREATED', null, null, newBot.id),
      };
    }

    case 'REMOVE_BOT': {
      if (state.bots.length === 0) return state;
      const toRemove = state.bots[state.bots.length - 1];
      const remaining = state.bots.filter(b => b.id !== toRemove.id);

      if (toRemove.status === 'idle') {
        return {
          ...state,
          bots: remaining,
          logs: buildLog(state, 'BOT_DESTROYED', null, null, toRemove.id),
        };
      }

      // Processing — return order to corresponding queue
      const order = toRemove.currentOrder;
      const resetOrder = { ...order, status: 'pending' };
      let logs = buildLog(state, 'ORDER_RETURNED', order.type, order.id, toRemove.id);
      logs = buildLog({ ...state, logs }, 'BOT_DESTROYED', null, null, toRemove.id);

      return {
        ...state,
        vipQueue: order.type === 'vip' ? [resetOrder, ...state.vipQueue] : state.vipQueue,
        normalQueue: order.type === 'normal' ? [resetOrder, ...state.normalQueue] : state.normalQueue,
        bots: remaining,
        logs,
      };
    }

    default:
      return state;
  }
}

export function OrderProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRefs = useRef({});

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timerRefs.current).forEach(clearTimeout);
    };
  }, []);

  // Bot processing loop: start timers for processing bots, pick orders for idle bots
  useEffect(() => {
    state.bots.forEach(bot => {
      if (bot.status === 'processing' && !timerRefs.current[bot.id]) {
        const timerId = setTimeout(() => {
          delete timerRefs.current[bot.id];
          dispatch({ type: 'COMPLETE_ORDER', payload: { botId: bot.id } });
        }, PROCESSING_TIME_MS);
        timerRefs.current[bot.id] = timerId;
      }

      if (bot.status === 'idle' && !timerRefs.current[bot.id]) {
        const hasOrders = state.vipQueue.length > 0 || state.normalQueue.length > 0;
        if (hasOrders) {
          // Use microtask to let current render finish
          Promise.resolve().then(() => {
            dispatch({ type: 'BOT_PICK_ORDER', payload: { botId: bot.id } });
          });
        }
      }
    });
  }, [state.bots, state.vipQueue.length, state.normalQueue.length]);

  const createOrder = useCallback((type) => {
    if (state.role !== 'customer') return;
    dispatch({ type: type === 'vip' ? 'ADD_VIP_ORDER' : 'ADD_NORMAL_ORDER' });
  }, [state.role]);

  const addBot = useCallback(() => {
    dispatch({ type: 'ADD_BOT' });
  }, []);

  const removeBot = useCallback(() => {
    const lastBot = state.bots[state.bots.length - 1];
    if (!lastBot) return;
    if (timerRefs.current[lastBot.id]) {
      clearTimeout(timerRefs.current[lastBot.id]);
      delete timerRefs.current[lastBot.id];
    }
    dispatch({ type: 'REMOVE_BOT' });
  }, [state.bots]);

  const setRole = useCallback((role) => {
    dispatch({ type: 'SET_ROLE', payload: role });
  }, []);

  return (
    <OrderContext.Provider value={{ state, createOrder, addBot, removeBot, setRole }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within OrderProvider');
  return ctx;
}
