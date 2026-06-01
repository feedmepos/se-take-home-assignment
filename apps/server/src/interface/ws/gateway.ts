import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@feedme/core';
import type { KitchenService } from '../../application/KitchenService';

/**
 * 注册 WebSocket 网关。每个连接:
 * 1. 建立时立即下发全量 STATE;
 * 2. 订阅领域事件,每次变更推送 EVENT(供动效)+ 最新 STATE(保证最终一致);
 * 3. 关闭时取消订阅,避免内存泄漏。
 */
export function registerWebSocketGateway(app: FastifyInstance, service: KitchenService): void {
  app.get('/ws', { websocket: true }, (socket: WebSocket) => {
    const send = (message: ServerMessage): void => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    };

    send({ type: 'STATE', payload: service.getState() });

    const unsubscribe = service.onEvent((event) => {
      send({ type: 'EVENT', payload: event });
      send({ type: 'STATE', payload: service.getState() });
    });

    socket.on('close', unsubscribe);
  });
}
