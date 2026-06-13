'use strict';

/** Format a Date as HH:MM:SS (24-hour, zero-padded). */
function hhmmss(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Print a line prefixed with the current HH:MM:SS timestamp. */
function logLine(message) {
  process.stdout.write(`[${hhmmss()}] ${message}\n`);
}

/** Human-readable one-line state summary. */
function formatState(controller) {
  const pending = controller.pending.map((o) => `#${o.id}(${o.type})`).join(', ') || '-';
  const complete = controller.complete.map((o) => `#${o.id}`).join(', ') || '-';
  const bots = controller.bots
    .map((b) => `bot${b.id}:${b.status}${b.order ? `(#${b.order.id})` : ''}`)
    .join(', ') || '-';
  return `PENDING [${pending}] | COMPLETE [${complete}] | BOTS [${bots}]`;
}

/**
 * Attach timestamped event logging to a controller.
 * Returns a detach function.
 */
function attachLogging(controller) {
  const handlers = {
    'order:new': (o) =>
      logLine(`New ${o.type} order #${o.id} -> PENDING`),
    'order:processing': (o, bot) =>
      logLine(`Bot ${bot.id} started processing ${o.type} order #${o.id}`),
    'order:complete': (o, bot) =>
      logLine(`Bot ${bot.id} completed order #${o.id} -> COMPLETE`),
    'order:returned': (o, bot) =>
      logLine(`Bot ${bot.id} destroyed mid-process; order #${o.id} returned to PENDING`),
    'bot:new': (bot) => logLine(`+ Bot ${bot.id} added`),
    'bot:removed': (bot) => logLine(`- Bot ${bot.id} removed`),
  };
  for (const [event, fn] of Object.entries(handlers)) {
    controller.on(event, fn);
  }
  return function detach() {
    for (const [event, fn] of Object.entries(handlers)) {
      controller.off(event, fn);
    }
  };
}

module.exports = { hhmmss, logLine, formatState, attachLogging };
