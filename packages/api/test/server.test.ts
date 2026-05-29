import { afterEach, describe, expect, it } from "vitest";

import { FakeScheduler, createOrderController } from "@feedme/core";

import { createServer, getSseAllowOrigin } from "../src/server.js";

describe("createServer", () => {
  afterEach(async (context) => {
    const app = (context as { app?: ReturnType<typeof createServer> }).app;
    if (app) {
      await app.close();
    }
  });

  it("returns the current snapshot", async (context) => {
    const controller = createOrderController({}, new FakeScheduler());
    controller.createNormalOrder();
    const app = createServer(controller);
    (context as { app?: ReturnType<typeof createServer> }).app = app;

    const response = await app.inject({
      method: "GET",
      url: "/state",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().snapshot.metrics.pendingCount).toBe(1);
  });

  it("returns a helpful error when removing a missing bot", async (context) => {
    const app = createServer(createOrderController({}, new FakeScheduler()));
    (context as { app?: ReturnType<typeof createServer> }).app = app;

    const response = await app.inject({
      method: "DELETE",
      url: "/bots/latest",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("No bots available");
  });

  it("removes a specific bot by id", async (context) => {
    const controller = createOrderController({}, new FakeScheduler());
    controller.addBot();
    controller.addBot();
    const app = createServer(controller);
    (context as { app?: ReturnType<typeof createServer> }).app = app;

    const response = await app.inject({
      method: "DELETE",
      url: "/bots/1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().snapshot.bots.map((bot: { id: number }) => bot.id)).toEqual([2]);
  });

  it("returns a helpful error when removing an invalid bot id", async (context) => {
    const app = createServer(createOrderController({}, new FakeScheduler()));
    (context as { app?: ReturnType<typeof createServer> }).app = app;

    const response = await app.inject({
      method: "DELETE",
      url: "/bots/not-a-number",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("botId must be a positive integer");
  });

  it("allows DELETE requests in CORS preflight responses", async (context) => {
    const app = createServer(createOrderController({}, new FakeScheduler()));
    (context as { app?: ReturnType<typeof createServer> }).app = app;

    const response = await app.inject({
      method: "OPTIONS",
      url: "/bots/latest",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "DELETE",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toContain("DELETE");
  });

  it("uses the request origin for SSE CORS headers", () => {
    expect(getSseAllowOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(getSseAllowOrigin(undefined)).toBe("*");
  });
});
