import type { OrderEvent } from '../types';

type Listener = (event: OrderEvent) => void;

class OrderEventClientImpl {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  constructor() {
    this.url = (import.meta.env.VITE_WS_URL || 'ws://localhost:3000') + '/ws';
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    console.log(`[WS] Connecting to ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: OrderEvent = JSON.parse(event.data as string);
        for (const listener of this.listeners) {
          listener(message);
        }
      } catch (err) {
        console.warn('[WS] Failed to parse message:', err);
      }
    };

    this.ws.onclose = (event) => {
      this.ws = null;
      console.log(`[WS] Disconnected (code: ${event.code})`);
      this.scheduleReconnect();
    };

    this.ws.onerror = (e) => {
      console.error('[WS] Connection error', e);
      this.ws?.close();
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    console.log('[WS] Disconnected');
  }
}

export const orderEventClient = new OrderEventClientImpl();
