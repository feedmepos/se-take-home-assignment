import { useEffect } from 'react';
import { connectKitchenSocket } from '../services/socket';
import { useKitchenStore } from '../store/useKitchenStore';

/** 在组件生命周期内维护 WebSocket 连接,并把消息写入全局 store。 */
export function useKitchenConnection(): void {
  useEffect(() => {
    const disconnect = connectKitchenSocket({
      onOpen: () => useKitchenStore.getState().setConnected(true),
      onClose: () => useKitchenStore.getState().setConnected(false),
      onMessage: (message) => {
        const store = useKitchenStore.getState();
        if (message.type === 'STATE') {
          store.applyState(message.payload);
        } else {
          store.applyEvent(message.payload);
        }
      },
    });
    return disconnect;
  }, []);
}
