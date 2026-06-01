import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { registerHttpRoutes } from './interface/http/routes';
import { registerWebSocketGateway } from './interface/ws/gateway';
import type { KitchenService } from './application/KitchenService';

export interface BuildAppOptions {
  logger?: boolean;
}

/** 组装 Fastify 应用:CORS + WebSocket 插件 + REST 路由 + WS 网关。 */
export async function buildApp(
  service: KitchenService,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  registerHttpRoutes(app, service);
  registerWebSocketGateway(app, service);

  return app;
}
