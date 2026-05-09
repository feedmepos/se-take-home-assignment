function createController({ queue, onLog, processingTime = 10000 }) {
  let nextOrderId = 1001;
  let nextBotId = 1;
  const bots = [];
  const completed = [];

  function timestamp() {
    return new Date().toTimeString().slice(0, 8);
  }

  function log(msg) {
    onLog(`[${timestamp()}] ${msg}`);
  }

  function pickNextOrder(bot) {
    const order = queue.dequeue();
    if (!order) {
      bot.currentOrder = null;
      bot.timer = null;
      log(`Bot #${bot.id} is IDLE - no pending orders`);
      return;
    }

    bot.currentOrder = order;
    log(`Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`);

    bot.timer = setTimeout(() => {
      const finishedOrder = bot.currentOrder;
      bot.currentOrder = null;
      bot.timer = null;
      completed.push(finishedOrder);
      log(`Bot #${bot.id} completed ${finishedOrder.type} Order #${finishedOrder.id} - Status: COMPLETE`);
      pickNextOrder(bot);
    }, processingTime);
  }

  return {
    addOrder(type) {
      const order = { id: nextOrderId++, type };
      queue.enqueue(order);
      log(`Created ${type} Order #${order.id} - Status: PENDING`);

      const idleBot = bots.find((b) => !b.currentOrder && !b.timer);
      if (idleBot) pickNextOrder(idleBot);

      return order;
    },

    addBot() {
      const bot = { id: nextBotId++, currentOrder: null, timer: null };
      bots.push(bot);
      log(`Bot #${bot.id} created - Status: ACTIVE`);
      pickNextOrder(bot);
      return bot;
    },

    removeBot() {
      if (bots.length === 0) {
        log('No bots to remove');
        return;
      }

      const bot = bots.pop();
      clearTimeout(bot.timer);

      if (bot.currentOrder) {
        const order = bot.currentOrder;
        bot.currentOrder = null;
        bot.timer = null;
        queue.returnToQueue(order);
        log(`Bot #${bot.id} destroyed - ${order.type} Order #${order.id} returned to PENDING`);
        const idleBot = bots.find((b) => !b.currentOrder && !b.timer);
        if (idleBot) pickNextOrder(idleBot);
      } else {
        log(`Bot #${bot.id} destroyed - was IDLE`);
      }
    },

    getStatus() {
      return { bots: [...bots], completed: [...completed], pending: queue.list() };
    },
  };
}

module.exports = { createController };
