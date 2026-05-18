const { log, writePlain } = require("./logger");

let orderId = 1;
let botId = 1;

let vipQueue = [];
let normalQueue = [];

let processingQueue = [];
let completedOrders = [];

let bots = [];

function resetState() {
  orderId = 1;
  botId = 1;

  vipQueue = [];
  normalQueue = [];

  processingQueue = [];
  completedOrders = [];

  bots = [];
}

function getNextOrder() {
  if (vipQueue.length > 0) {
    return vipQueue.shift();
  }

  if (normalQueue.length > 0) {
    return normalQueue.shift();
  }

  return null;
}

function startBot(bot) {
  const order = getNextOrder();

  if (!order) {
    bot.status = "IDLE";
    log(`Bot #${bot.id} is now IDLE - No pending orders`);
    return;
  }

  bot.status = "PROCESSING";
  bot.currentOrder = order;

  order.status = "PROCESSING";

  processingQueue.push(order);

  log(
    `Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`
  );

  bot.timer = setTimeout(() => {
    completeOrder(bot);
  }, 10000);
}

function completeOrder(bot) {
  const order = bot.currentOrder;

  processingQueue = processingQueue.filter(
    o => o.id !== order.id
  );

  order.status = "COMPLETE";

  completedOrders.push(order);

  bot.status = "IDLE";
  bot.currentOrder = null;

  log(
    `Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: COMPLETE (Processing time: 10s)`
  );

  startBot(bot);
}

function assignOrdersToBots() {
  for (let bot of bots) {
    if (bot.status === "IDLE") {
      startBot(bot);
    }
  }
}

function createVipOrder() {
  const order = {
    id: orderId++,
    type: "VIP",
    status: "PENDING",
  };

  vipQueue.push(order);

  log(
    `NEW ORDER CREATED → VIP Order #${order.id} | Status: PENDING | Queue: VIP`
  );

  assignOrdersToBots();

  return order;
}

function createNormalOrder() {
  const order = {
    id: orderId++,
    type: "NORMAL",
    status: "PENDING",
  };

  normalQueue.push(order);

  log(
    `NEW ORDER CREATED → Normal Order #${order.id} | Status: PENDING | Queue: NORMAL`
  );

  assignOrdersToBots();

  return order;
}

function addBot() {
  const bot = {
    id: botId++,
    status: "IDLE",
    currentOrder: null,
    timer: null,
  };

  bots.push(bot);

  log(`Bot #${bot.id} created - Status: ACTIVE`);

  assignOrdersToBots();

  return bot;
}

function removeBot() {
  const bot = bots.pop();

  if (!bot) {
    log("No bot to remove");
    return;
  }

  // If bot was processing an order
  if (bot.timer) {
    clearTimeout(bot.timer);

    if (bot.currentOrder) {
      const order = bot.currentOrder;

      // remove from processing queue
      processingQueue = processingQueue.filter(
        o => o.id !== order.id
      );

      order.status = "PENDING";

      if (order.type === "VIP") {
        vipQueue.unshift(order);
      } else {
        normalQueue.unshift(order);
      }

      log(
        `Bot #${bot.id} removed - Order #${order.id} (${order.type}) returned to ${order.type} queue`
      );

    } else {
      log(`Bot #${bot.id} removed - No active order`);
    }

  } else {
    log(`Bot #${bot.id} removed - Idle`);
  }

  bot.currentOrder = null;
  bot.status = "REMOVED";
}

function getState() {
  return {
    vipQueue,
    normalQueue,
    processingQueue,
    completedOrders,
    bots,
  };
}

module.exports = {
  resetState,
  createVipOrder,
  createNormalOrder,
  addBot,
  removeBot,
  completeOrder,
  getState,
};