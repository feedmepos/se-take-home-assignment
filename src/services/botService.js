const { state, getStateSnapshot } = require('../state');
const { generateSystemId, generateDisplayId } = require('../utils/idHelper');
const { log, broadcastState } = require('../logger');
const { insertPending, getPendingOrders } = require('./orderService');

const ORDER_PROCESS_MS = 10000;

function assignNextOrder(bot) {
  const pending = getPendingOrders();
  if (pending.length === 0) {
    bot.status = 'IDLE';
    bot.currentOrderId = null;
    log(`Bot ${bot.displayId} is now [IDLE]`);
    broadcastState(getStateSnapshot());
    return;
  }

  const order = pending[0];
  order.status = 'PROCESSING';
  order.processingBotId = bot.systemId;
  bot.status = 'PROCESSING';
  bot.currentOrderId = order.systemId;

  log(`Bot ${bot.displayId} picked up order ${order.displayId} [PROCESSING]`);
  broadcastState(getStateSnapshot());

  bot.timer = setTimeout(() => {
    order.status = 'COMPLETE';
    order.completedAt = new Date();
    bot.currentOrderId = null;
    bot.timer = null;

    log(`Order ${order.displayId} completed [COMPLETE]`);
    assignNextOrder(bot);
  }, ORDER_PROCESS_MS);
}

function addBot() {
  const bot = {
    systemId: generateSystemId(),
    displayId: generateDisplayId('Bot'),
    status: 'IDLE',
    currentOrderId: null,
    timer: null,
  };

  state.bots.push(bot);
  log(`Bot ${bot.displayId} created [IDLE]`);
  broadcastState(getStateSnapshot());

  assignNextOrder(bot);
  return bot;
}

function removeNewestBot() {
  if (state.bots.length === 0) return null;

  const bot = state.bots[state.bots.length - 1];

  if (bot.timer) {
    clearTimeout(bot.timer);
    bot.timer = null;
  }

  if (bot.currentOrderId) {
    const order = state.orders.find(o => o.systemId === bot.currentOrderId);
    if (order) {
      order.status = 'PENDING';
      order.processingBotId = null;
      order.completedAt = null;
      // Remove from current position and re-insert at correct priority slot
      const idx = state.orders.indexOf(order);
      state.orders.splice(idx, 1);
      insertPending(order);
      log(`Order ${order.displayId} returned to queue [PENDING]`);
    }
  }

  state.bots.pop();
  log(`Bot ${bot.displayId} removed`);
  broadcastState(getStateSnapshot());
  return bot;
}

// Called when a new order is created — assign to any idle bot
function tryAssignIdleBot() {
  const idleBot = state.bots.find(b => b.status === 'IDLE');
  if (idleBot) assignNextOrder(idleBot);
}

module.exports = { addBot, removeNewestBot, tryAssignIdleBot };
