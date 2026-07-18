'use client';

import { useMemo } from 'react';
import type { Order } from '@/domain';
import { selectComplete, selectPending, selectProcessing } from '../selectors';
import { ControllerState } from '../state';

export interface OrderColumns {
  pending: Order[];
  processing: Order[];
  complete: Order[];
}

export function useOrderColumns(state: ControllerState): OrderColumns {
  return useMemo(
    () => ({
      pending: selectPending(state),
      processing: selectProcessing(state),
      complete: selectComplete(state),
    }),
    [state],
  );
}
