import { Response } from 'express';
import { Order } from './types.js';
import { Bot } from './types.js';

interface SSEClient {
  res: Response;
  id: string;
}

interface StateUpdate {
  orders: Order[];
  bots: Bot[];
}

class SSEManager {
  private clients: Set<SSEClient> = new Set();
  private clientCounter = 0;

  addClient(res: Response): string {
    const id = `client-${++this.clientCounter}`;
    const client: SSEClient = { res, id };
    this.clients.add(client);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Handle client disconnect
    res.on('close', () => {
      this.clients.delete(client);
    });

    res.on('error', () => {
      this.clients.delete(client);
    });

    return id;
  }

  broadcast(state: StateUpdate): void {
    const data = JSON.stringify({
      type: 'state-update',
      payload: state,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach((client) => {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  closeAll(): void {
    this.clients.forEach((client) => {
      try {
        client.res.end();
      } catch (error) {
        // Ignore errors
      }
    });
    this.clients.clear();
  }
}

export const sseManager = new SSEManager();
