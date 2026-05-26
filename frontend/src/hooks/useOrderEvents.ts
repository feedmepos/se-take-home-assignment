import { useEffect, useRef } from 'react';
import { orderEventClient } from '../services/OrderEventClient';
import type { OrderEvent } from '../types';

export function useOrderEvents(onEvent: (event: OrderEvent) => void): void {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    const listener = (event: OrderEvent) => onEventRef.current(event);
    return orderEventClient.subscribe(listener);
  }, []);
}
