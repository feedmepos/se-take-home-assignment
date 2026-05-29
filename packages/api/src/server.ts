import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  ControllerError,
  createOrderController,
  type DomainEvent,
  type OrderController,
  type OrderPriority,
  type SystemSnapshot,
} from "@feedme/core";

function serializeEvent(event: DomainEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function getSseAllowOrigin(originHeader?: string): string {
  return typeof originHeader === "string" && originHeader.length > 0 ? originHeader : "*";
}

export function createServer(controller: OrderController = createOrderController()) {
  const app = Fastify({ logger: false });
  const clients = new Set<NodeJS.WritableStream>();

  void app.register(cors, {
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    origin: true,
  });

  const unsubscribe = controller.subscribe((event: DomainEvent) => {
    const payload = serializeEvent(event);
    for (const client of clients) {
      client.write(payload);
    }
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/state", async () => ({ snapshot: controller.getSnapshot() }));

  app.post<{ Body: { priority: OrderPriority } }>("/orders", async (request, reply) => {
    if (request.body?.priority !== "vip" && request.body?.priority !== "normal") {
      reply.code(400);
      return { error: "priority must be normal or vip" };
    }
    controller.createOrder(request.body.priority);
    return { snapshot: controller.getSnapshot() };
  });

  app.post("/bots", async () => {
    controller.addBot();
    return { snapshot: controller.getSnapshot() };
  });

  app.delete("/bots/latest", async (request, reply) => {
    try {
      controller.removeLatestBot();
      return { snapshot: controller.getSnapshot() };
    } catch (error: unknown) {
      if (error instanceof ControllerError) {
        reply.code(400);
        return { error: error.message };
      }
      throw error;
    }
  });

  app.delete<{ Params: { botId: string } }>("/bots/:botId", async (request, reply) => {
    const botId = Number(request.params.botId);
    if (!Number.isInteger(botId) || botId <= 0) {
      reply.code(400);
      return { error: "botId must be a positive integer" };
    }

    try {
      controller.removeBot(botId);
      return { snapshot: controller.getSnapshot() };
    } catch (error: unknown) {
      if (error instanceof ControllerError) {
        reply.code(400);
        return { error: error.message };
      }
      throw error;
    }
  });

  app.get("/events", async (request, reply) => {
    const allowOrigin = getSseAllowOrigin(request.headers.origin);

    reply.raw.setHeader("Access-Control-Allow-Origin", allowOrigin);
    reply.raw.setHeader("Vary", "Origin");
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders?.();
    reply.hijack();
    clients.add(reply.raw);
    const initialEvent = {
      id: 0,
      type: "bot.idle",
      timestamp: Date.now(),
      message: "Event stream connected",
      snapshot: controller.getSnapshot(),
    } satisfies DomainEvent;
    reply.raw.write(serializeEvent(initialEvent));
    request.raw.on("close", () => {
      clients.delete(reply.raw);
    });
  });

  app.addHook("onClose", async () => {
    unsubscribe();
    clients.clear();
  });

  return app;
}

export type ApiSnapshotResponse = {
  snapshot: SystemSnapshot;
};
