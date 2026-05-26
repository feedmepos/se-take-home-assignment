import { useEffect } from 'react';
import { orderEventClient } from '../services/OrderEventClient';

export function useWebSocket(): void {
  useEffect(() => {
    orderEventClient.connect();
    return () => orderEventClient.disconnect();
  }, []);
}
