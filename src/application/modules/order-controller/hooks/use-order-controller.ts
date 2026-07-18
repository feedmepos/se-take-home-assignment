'use client';

import { useCallback, useContext, useMemo } from 'react';
import { OrderType, type Bot } from '@/domain';
import { OrderControllerContext } from '../providers/order-controller-provider';
import { useOrderColumns, type OrderColumns } from './use-order-columns';

export interface UseOrderControllerResult extends OrderColumns {
  bots: readonly Bot[];
  createNormalOrder: () => void;
  createVipOrder: () => void;
  addBot: () => void;
  removeBot: () => void;
}

export function useOrderController(): UseOrderControllerResult {
  const ctx = useContext(OrderControllerContext);
  if (!ctx) {
    throw new Error(
      'useOrderController must be used within an OrderControllerProvider',
    );
  }
  const { state, dispatch } = ctx;
  const columns = useOrderColumns(state);

  const createNormalOrder = useCallback(
    () => dispatch({ type: 'CREATE_ORDER', orderType: OrderType.NORMAL }),
    [dispatch],
  );
  const createVipOrder = useCallback(
    () => dispatch({ type: 'CREATE_ORDER', orderType: OrderType.VIP }),
    [dispatch],
  );
  const addBot = useCallback(() => dispatch({ type: 'ADD_BOT' }), [dispatch]);
  const removeBot = useCallback(
    () => dispatch({ type: 'REMOVE_BOT' }),
    [dispatch],
  );

  return useMemo(
    () => ({
      ...columns,
      bots: state.bots,
      createNormalOrder,
      createVipOrder,
      addBot,
      removeBot,
    }),
    [columns, state.bots, createNormalOrder, createVipOrder, addBot, removeBot],
  );
}
