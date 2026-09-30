'use strict';

function timestamp(date) { return date.toISOString().slice(11, 19); }

function formatEvent(event) {
  const order = event.orderId ? `${event.orderType} Order #${event.orderId}` : '';
  const bot = event.botId ? `Bot #${event.botId}` : '';
  const messages = {
    'order-added': `${order} added to PENDING`,
    'bot-added': `${bot} added`,
    'order-started': `${bot} started ${order}`,
    'order-completed': `${bot} completed ${order} (10 seconds)`,
    'order-returned': `${bot} stopped; ${order} returned to PENDING`,
    'bot-removed': `${bot} removed`,
    'bot-idle': `${bot} is IDLE`
  };
  return `[${timestamp(event.time)}] ${messages[event.type]}`;
}

function formatStatus(state, date) {
  const orders = list => list.length
    ? list.map(order => `#${order.id} ${order.type} (${order.status})`).join(', ')
    : '(none)';
  const bots = state.bots.length
    ? state.bots.map(bot => `#${bot.id} ${bot.status}${bot.orderId ? ` Order #${bot.orderId}` : ''}`).join(', ')
    : '(none)';
  return `[${timestamp(date)}] PENDING: ${orders(state.pending)}\n` +
    `[${timestamp(date)}] COMPLETE: ${orders(state.complete)}\n` +
    `[${timestamp(date)}] BOTS: ${bots}`;
}

module.exports = { timestamp, formatEvent, formatStatus };
