// order-controller.js

class OrderController {
  constructor({ processingTimeSeconds = 10, logFn = console.log } = {}) {
    this.processingTimeSeconds = processingTimeSeconds;
    this.log = logFn;

    this.currentTime = 0; // simulated seconds
    this.nextOrderId = 1;
    this.nextBotId = 1;

    this.vipQueue = [];
    this.normalQueue = [];
    this.completedOrders = [];
    this.bots = []; // { id, status: 'IDLE' | 'BUSY', orderId, remainingTime }

    this.orders = new Map(); // orderId -> { id, type, status }
  }

  // ---------- Helpers ----------
  formatTime(seconds) {
    const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  logWithTime(message) {
    this.log(`[${this.formatTime(this.currentTime)}] ${message}`);
  }

  // ---------- Orders ----------
  createOrder(type) {
    const id = this.nextOrderId++;
    const order = { id, type, status: "PENDING" }; // type: 'VIP' | 'NORMAL'
    this.orders.set(id, order);

    if (type === "VIP") {
      this.vipQueue.push(id);
    } else {
      this.normalQueue.push(id);
    }

    this.logWithTime(`New ${type} order #${id} created -> PENDING`);
    this.dispatchOrders();
    return id;
  }

  createNormalOrder() {
    return this.createOrder("NORMAL");
  }

  createVipOrder() {
    return this.createOrder("VIP");
  }

  // ---------- Bots ----------
  addBot() {
    const bot = {
      id: this.nextBotId++,
      status: "IDLE",
      orderId: null,
      remainingTime: 0,
    };
    this.bots.push(bot);
    this.logWithTime(`Bot #${bot.id} added (IDLE)`);
    this.dispatchOrders();
    return bot.id;
  }

  removeBot() {
    if (this.bots.length === 0) {
      this.logWithTime("No bot to remove");
      return null;
    }

    const bot = this.bots.pop(); // newest bot
    this.logWithTime(`Removing bot #${bot.id}`);

    // If bot was busy, put its order back to PENDING
    if (bot.status === "BUSY" && bot.orderId != null) {
      const order = this.orders.get(bot.orderId);
      if (order) {
        order.status = "PENDING";
        if (order.type === "VIP") {
          this.vipQueue.unshift(order.id); // front of VIP queue
        } else {
          this.normalQueue.unshift(order.id);
        }
        this.logWithTime(
          `Bot #${bot.id} was processing order #${order.id}, put back to PENDING`
        );
      }
    }

    return bot.id;
  }

  getNextOrderIdFromQueues() {
    if (this.vipQueue.length > 0) {
      return this.vipQueue.shift();
    }
    if (this.normalQueue.length > 0) {
      return this.normalQueue.shift();
    }
    return null;
  }

  // Assign pending orders to idle bots
  dispatchOrders() {
    for (const bot of this.bots) {
      if (bot.status !== "IDLE") continue;

      const nextOrderId = this.getNextOrderIdFromQueues();
      if (nextOrderId == null) continue;

      const order = this.orders.get(nextOrderId);
      if (!order) continue;

      order.status = "PROCESSING";
      bot.status = "BUSY";
      bot.orderId = nextOrderId;
      bot.remainingTime = this.processingTimeSeconds;

      this.logWithTime(
        `Bot #${bot.id} started processing order #${order.id} (${order.type})`
      );
    }
  }

  // ---------- Time simulation ----------
  tickOneSecond() {
    this.currentTime += 1;

    for (const bot of this.bots) {
      if (bot.status === "BUSY") {
        bot.remainingTime -= 1;
        if (bot.remainingTime <= 0 && bot.orderId != null) {
          const order = this.orders.get(bot.orderId);
          if (order) {
            order.status = "COMPLETE";
            this.completedOrders.push(order.id);
            this.logWithTime(
              `Bot #${bot.id} completed order #${order.id} (${order.type}) -> COMPLETE`
            );
          }
          bot.status = "IDLE";
          bot.orderId = null;
          bot.remainingTime = 0;
        }
      }
    }

    // After completion, try to pick up new orders
    this.dispatchOrders();
  }

  runUntil(targetTimeSeconds) {
    while (this.currentTime < targetTimeSeconds) {
      this.tickOneSecond();
    }
  }

  // Snapshot for debugging / tests
  getSnapshot() {
    return {
      time: this.currentTime,
      vipQueue: [...this.vipQueue],
      normalQueue: [...this.normalQueue],
      completedOrders: [...this.completedOrders],
      bots: this.bots.map((b) => ({
        id: b.id,
        status: b.status,
        orderId: b.orderId,
        remainingTime: b.remainingTime,
      })),
      orders: Array.from(this.orders.values()),
    };
  }
}

module.exports = { OrderController };
