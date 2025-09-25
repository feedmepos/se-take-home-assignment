import { useReducer, useEffect, useRef, useCallback } from 'react';
import { orderReducer, initialState, UX_CONFIG } from '@/lib/orderReducer';
import { OrderItem } from '@/types';

export function useOrderController() {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  const orderTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());


  const clearOrderTimeout = useCallback((orderId: number) => {
    const timeoutId = orderTimeouts.current.get(orderId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      orderTimeouts.current.delete(orderId);
    }
  }, []);

  const createOrder = (orderType: 'normal' | 'vip', items: OrderItem[]) => {
    dispatch({ type: 'CREATE_ORDER', payload: { orderType, items } });
  };

  const addBot = () => {
    dispatch({ type: 'ADD_BOT' });
  };

  const removeBot = () => {
    if (state.bots.length === 0) return;

    const botToRemove = state.bots[state.bots.length - 1];
    
    const affectedOrderIds: number[] = [];
    state.orders.forEach(order => {
      if (order.status === 'processing' && order.processingBotId === botToRemove.id) {
        affectedOrderIds.push(order.id);
      }
    });

    affectedOrderIds.forEach(orderId => clearOrderTimeout(orderId));

    dispatch({ type: 'REMOVE_BOT' });
  };

  useEffect(() => {
    const idleBots = state.bots.filter(bot => bot.status === 'idle');
    const pendingOrdersList = state.orders.filter(order => order.status === 'pending');

    // Process assignments one by one to avoid race conditions
    if (idleBots.length > 0 && pendingOrdersList.length > 0) {
      const orderToProcess = pendingOrdersList[0];
      const botToAssign = idleBots[0];

      if (!orderTimeouts.current.has(orderToProcess.id)) {
        dispatch({
          type: 'START_PROCESSING',
          payload: { orderId: orderToProcess.id, botId: botToAssign.id }
        });

        const timeoutId = setTimeout(() => {
          dispatch({
            type: 'COMPLETE_ORDER',
            payload: { orderId: orderToProcess.id, botId: botToAssign.id }
          });

          clearOrderTimeout(orderToProcess.id);
        }, 10000);

        orderTimeouts.current.set(orderToProcess.id, timeoutId);
      }
    }
  }, [state.bots, state.orders, clearOrderTimeout]);


  useEffect(() => {
    return () => {
      for (const [orderId] of orderTimeouts.current) {
        clearOrderTimeout(orderId);
      }
    };
  }, [clearOrderTimeout]);

  const pendingOrders = state.orders.filter(o => o.status === 'pending');
  const processingOrders = state.orders.filter(o => o.status === 'processing');
  const completeOrders = state.orders.filter(o => o.status === 'complete');
  const canAddBot = state.bots.length < UX_CONFIG.MAX_BOTS;

  return {
    state,
    pendingOrders,
    processingOrders,
    completeOrders,
    createOrder,
    addBot,
    removeBot,
    canAddBot,
    maxBots: UX_CONFIG.MAX_BOTS,
    maxOrdersPerStatus: UX_CONFIG.MAX_ORDERS_PER_STATUS,
  };
}