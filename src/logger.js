'use strict';

const { BotStatus } = require('./bot');

/** Timestamps are required by the CI check, which greps for HH:MM:SS. */
function timestamp(date = new Date()) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

function labelOrder(order) {
  return `${order.type}#${order.id}`;
}

function describeEvent(event) {
  switch (event.type) {
    case 'ORDER_CREATED':
      return `Order ${labelOrder(event.order)} submitted -> PENDING`;
    case 'ORDER_PICKED':
      return `Bot ${event.bot.id} picked up ${labelOrder(event.order)} -> PROCESSING`;
    case 'ORDER_COMPLETED':
      return `Bot ${event.bot.id} finished ${labelOrder(event.order)} -> COMPLETE`;
    case 'ORDER_REQUEUED':
      return `Order ${labelOrder(event.order)} returned to PENDING (cooking cancelled)`;
    case 'BOT_ADDED':
      return `Bot ${event.bot.id} created`;
    case 'BOT_REMOVED':
      return `Bot ${event.bot.id} destroyed`;
    case 'BOT_REMOVE_NOOP':
      return 'No bot to destroy';
    case 'BOT_IDLE':
      return `Bot ${event.bot.id} is IDLE`;
    default:
      return null;
  }
}

function renderState(controller) {
  const pending = controller.pendingOrders.map(labelOrder).join(', ') || '-';
  const completed = controller.completedOrders.map(labelOrder).join(', ') || '-';
  const bots =
    controller.bots
      .map((bot) =>
        bot.status === BotStatus.PROCESSING
          ? `Bot ${bot.id}: ${labelOrder(bot.order)}`
          : `Bot ${bot.id}: IDLE`,
      )
      .join(' | ') || '-';

  return [`  PENDING  : ${pending}`, `  COMPLETE : ${completed}`, `  BOTS     : ${bots}`].join('\n');
}

module.exports = { timestamp, labelOrder, describeEvent, renderState };
