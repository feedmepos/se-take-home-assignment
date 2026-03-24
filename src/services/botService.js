const { state, getStateSnapshot } = require('../state');
const { generateSystemId, generateBotDisplayId } = require('../utils/idHelper');
const { log, broadcastState } = require('../logger');
const { insertPending, getPendingOrders } = require('./orderService');
const { ORDER_PROCESS_MS, ORDER_STATUS, BOT_STATUS } = require('../constants');

function assignNextOrder(bot) {
  const pending = getPendingOrders();
  if (pending.length === 0) {
    bot.status = BOT_STATUS.IDLE;
    bot.currentOrderId = null;
    log(`Bot ${bot.displayId} is now [${BOT_STATUS.IDLE}]`);
    broadcastState(getStateSnapshot());
    return;
  }

  const order = pending[0];
  order.status = ORDER_STATUS.PROCESSING;
  order.processingBotId = bot.systemId;
  bot.status = BOT_STATUS.PROCESSING;
  bot.currentOrderId = order.systemId;

  log(`Bot ${bot.displayId} picked up order ${order.displayId} [${BOT_STATUS.PROCESSING}]`);
  broadcastState(getStateSnapshot());

  bot.timer = setTimeout(() => {
    order.status = ORDER_STATUS.COMPLETE;
    order.completedAt = new Date();
    bot.currentOrderId = null;
    bot.timer = null;

    log(`Order ${order.displayId} completed [${ORDER_STATUS.COMPLETE}]`);
    assignNextOrder(bot);
  }, ORDER_PROCESS_MS);
}

function addBot() {
  const bot = {
    systemId: generateSystemId(),
    displayId: generateBotDisplayId(),
    status: BOT_STATUS.IDLE,
    currentOrderId: null,
    timer: null,
  };

  state.bots.push(bot);
  log(`Bot ${bot.displayId} created [${BOT_STATUS.IDLE}]`);
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
      order.status = ORDER_STATUS.PENDING;
      order.processingBotId = null;
      order.completedAt = null;
      const idx = state.orders.indexOf(order);
      state.orders.splice(idx, 1);
      insertPending(order);
      log(`Order ${order.displayId} returned to queue [${ORDER_STATUS.PENDING}]`);
    }
  }

  state.bots.pop();
  log(`Bot ${bot.displayId} removed`);
  broadcastState(getStateSnapshot());
  return bot;
}

function tryAssignIdleBot() {
  const idleBot = state.bots.find(b => b.status === BOT_STATUS.IDLE);
  if (idleBot) assignNextOrder(idleBot);
}

module.exports = { addBot, removeNewestBot, tryAssignIdleBot };
