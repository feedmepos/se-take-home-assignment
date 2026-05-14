import { useEffect, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setOrders, setBots } from '../store/slices';
import { SystemState } from '../types';

interface SSEMessage {
  type: 'connected' | 'initial-state' | 'state-update';
  payload?: SystemState;
}

export function useSSE() {
  const dispatch = useAppDispatch();

  const handleMessage = useCallback(
    (message: SSEMessage) => {
      if (message.type === 'initial-state' || message.type === 'state-update') {
        if (message.payload) {
          dispatch(setOrders(message.payload.orders));
          dispatch(setBots(message.payload.bots));
        }
      }
    },
    [dispatch]
  );

  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    };

    return () => {
      eventSource.close();
    };
  }, [handleMessage]);
}
