import { config } from '../config';
import type { ServerMessage } from '@feedme/core';

export interface SocketHandlers {
  onMessage: (message: ServerMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * 建立 WebSocket 连接,断线后自动重连。返回断开函数。
 */
export function connectKitchenSocket(handlers: SocketHandlers): () => void {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const open = (): void => {
    socket = new WebSocket(config.wsUrl);

    socket.onopen = () => handlers.onOpen?.();

    socket.onmessage = (event) => {
      try {
        handlers.onMessage(JSON.parse(event.data as string) as ServerMessage);
      } catch {
        // 忽略无法解析的消息
      }
    };

    socket.onclose = () => {
      handlers.onClose?.();
      if (!closed) {
        reconnectTimer = setTimeout(open, 1500);
      }
    };

    socket.onerror = () => socket?.close();
  };

  open();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
