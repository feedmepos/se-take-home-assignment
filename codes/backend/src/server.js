'use strict';

/**
 * Tiny HTTP API + Server-Sent-Events bridge around the OrderController, so the
 * Vue/antdv frontend can drive and observe the system in real time.
 *
 * Built entirely on Node's `http` module -- no external dependencies.
 *
 * Endpoints:
 *   GET    /api/state     -> { pending, complete, bots }
 *   GET    /api/events    -> text/event-stream, pushes state on every change
 *   POST   /api/orders    -> body { "type": "NORMAL" | "VIP" }, adds an order
 *   POST   /api/bots      -> add a bot
 *   DELETE /api/bots      -> remove the newest bot
 *
 * Env:
 *   PORT        HTTP port (default 3001)
 *   PROCESS_MS  ms per order (default 10000)
 */

const http = require('http');
const { OrderController, OrderType } = require('./orderController');

const PORT = Number(process.env.PORT) || 3001;
const PROCESS_MS = Number(process.env.PROCESS_MS) || 10000;

const controller = new OrderController({ processMs: PROCESS_MS });

/** @type {Set<import('http').ServerResponse>} active SSE clients */
const sseClients = new Set();

function broadcastState() {
  const payload = JSON.stringify({ processMs: PROCESS_MS, ...controller.snapshot() });
  for (const res of sseClients) {
    res.write(`data: ${payload}\n\n`);
  }
}

// Re-broadcast on every meaningful change.
for (const event of [
  'order:new',
  'order:processing',
  'order:complete',
  'order:returned',
  'bot:new',
  'bot:removed',
]) {
  controller.on(event, broadcastState);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // Live state stream.
  if (method === 'GET' && path === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...CORS_HEADERS,
    });
    res.write(`data: ${JSON.stringify({ processMs: PROCESS_MS, ...controller.snapshot() })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (method === 'GET' && path === '/api/state') {
    return sendJson(res, 200, { processMs: PROCESS_MS, ...controller.snapshot() });
  }

  if (method === 'POST' && path === '/api/orders') {
    const body = await readBody(req);
    const type = body.type === OrderType.VIP ? OrderType.VIP : OrderType.NORMAL;
    const order = controller.addOrder(type);
    return sendJson(res, 201, { order: { id: order.id, type: order.type } });
  }

  if (method === 'POST' && path === '/api/bots') {
    const bot = controller.addBot();
    return sendJson(res, 201, { bot: { id: bot.id } });
  }

  if (method === 'DELETE' && path === '/api/bots') {
    const bot = controller.removeBot();
    return sendJson(res, 200, { removed: bot ? bot.id : null });
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Order controller API listening on http://localhost:${PORT}`);
  console.log(`Processing time per order: ${PROCESS_MS}ms`);
});
