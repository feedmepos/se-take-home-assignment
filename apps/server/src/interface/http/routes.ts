import type { FastifyInstance } from 'fastify';
import { OrderType } from '@feedme/core';
import type { OrderTypeCommand } from '@feedme/core';
import type { KitchenService } from '../../application/KitchenService';

const toOrderType = (value: OrderTypeCommand): OrderType =>
  value === 'VIP' ? OrderType.VIP : OrderType.NORMAL;

const isOrderTypeCommand = (value: unknown): value is OrderTypeCommand =>
  value === 'NORMAL' || value === 'VIP';

/** 注册 REST 命令与状态查询路由。命令成功后统一返回最新全量状态。 */
export function registerHttpRoutes(app: FastifyInstance, service: KitchenService): void {
  app.get('/api/state', () => service.getState());

  app.post<{ Body: { type?: unknown } }>('/api/orders', (request, reply) => {
    const type = request.body?.type;
    if (!isOrderTypeCommand(type)) {
      return reply.code(400).send({ error: 'type must be "NORMAL" or "VIP"' });
    }
    service.createOrder(toOrderType(type));
    return reply.send({ state: service.getState() });
  });

  app.post('/api/bots', () => {
    service.addBot();
    return { state: service.getState() };
  });

  app.delete('/api/bots', () => {
    service.removeBot();
    return { state: service.getState() };
  });
}
