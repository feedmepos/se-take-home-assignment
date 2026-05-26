import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { OrderProcessingEngine } from '../../domain/service/OrderProcessingEngine.js';
import { logger } from '../logger.js';

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clientCount = 0;

  attach(server: Server, engine: OrderProcessingEngine): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clientCount++;
      logger.info('WS client connected', { total: this.clientCount });

      ws.on('close', () => {
        this.clientCount--;
        logger.info('WS client disconnected', { total: this.clientCount });
      });

      ws.on('error', (err) => {
        logger.warn('WS client error', { message: err.message });
      });
    });

    this.wss.on('error', (err) => {
      logger.error('WS server error', { message: err.message });
    });

    engine.addListener('order:completed', (payload) => {
      this.broadcast('order:completed', payload);
    });

    engine.addListener('bot:status_changed', (payload) => {
      this.broadcast('bot:status_changed', payload);
    });

    logger.info('WebSocket server attached');
  }

  private broadcast(event: string, payload: unknown): void {
    if (!this.wss) return;
    const message = JSON.stringify({ event, payload });
    let sent = 0;
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent++;
      }
    }
    logger.info('WS broadcast', { event, recipients: sent });
  }
}
