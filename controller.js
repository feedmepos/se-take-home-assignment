class Order {
  constructor(id, type_) {
    this.id = id;
    this.type = type_;
    this.status = "PENDING";
  }
}

class Bot {
  constructor(id) {
    this.id = id;
    this.currentOrder = null;
    this.timer = null;
  }
}

class OrderController {
  constructor(processingTime, logFn) {
    this.pendingOrders = [];
    this.completeOrders = [];
    this.bots = [];
    this.nextOrderID = 1;
    this.nextBotID = 1;
    this.processingTime = processingTime;
    this.logFn = logFn || (() => {});
  }

  newNormalOrder() {
    const order = new Order(this.nextOrderID++, "Normal");
    this.pendingOrders.push(order);
    this.logFn(`Created Normal Order #${order.id} - Status: PENDING`);
    this._assignToIdleBot();
    return order;
  }

  newVIPOrder() {
    const order = new Order(this.nextOrderID++, "VIP");
    let pos = 0;
    while (pos < this.pendingOrders.length && this.pendingOrders[pos].type === "VIP") {
      pos++;
    }
    this.pendingOrders.splice(pos, 0, order);
    this.logFn(`Created VIP Order #${order.id} - Status: PENDING`);
    this._assignToIdleBot();
    return order;
  }

  addBot() {
    const bot = new Bot(this.nextBotID++);
    this.bots.push(bot);
    this.logFn(`Bot #${bot.id} created - Status: ACTIVE`);
    this._pickupAndAssign(bot);
    return bot;
  }

  removeBot() {
    if (this.bots.length === 0) return;

    const bot = this.bots.pop();

    if (bot.currentOrder) {
      clearTimeout(bot.timer);
      const order = bot.currentOrder;
      order.status = "PENDING";
      bot.currentOrder = null;
      this._returnOrderToQueue(order);
      this.logFn(`Bot #${bot.id} destroyed while processing ${order.type} Order #${order.id} - Order returned to PENDING`);
    } else {
      this.logFn(`Bot #${bot.id} destroyed while IDLE`);
    }
  }

  _assignToIdleBot() {
    if (this.pendingOrders.length === 0) return;
    for (const bot of this.bots) {
      if (!bot.currentOrder) {
        this._pickupAndAssign(bot);
        return;
      }
    }
  }

  _pickupAndAssign(bot) {
    if (this.pendingOrders.length === 0) return false;

    const order = this.pendingOrders.shift();
    order.status = "PROCESSING";
    bot.currentOrder = order;
    this.logFn(`Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`);

    bot.timer = setTimeout(() => {
      this._completeOrder(bot);
    }, this.processingTime);

    return true;
  }

  _completeOrder(bot) {
    const order = bot.currentOrder;
    if (!order) return;

    order.status = "COMPLETE";
    bot.currentOrder = null;
    bot.timer = null;
    this.completeOrders.push(order);
    this.logFn(`Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: COMPLETE (Processing time: ${this.processingTime / 1000}s)`);

    if (!this._pickupAndAssign(bot)) {
      this.logFn(`Bot #${bot.id} is now IDLE - No pending orders`);
    }
  }

  _returnOrderToQueue(order) {
    let pos = 0;
    if (order.type === "Normal") {
      while (pos < this.pendingOrders.length && this.pendingOrders[pos].type === "VIP") {
        pos++;
      }
    }
    this.pendingOrders.splice(pos, 0, order);
  }

  getStatus() {
    let vipCount = 0;
    let normalCount = 0;
    for (const order of this.completeOrders) {
      if (order.type === "VIP") vipCount++;
      else normalCount++;
    }
    return {
      totalCompleted: this.completeOrders.length,
      vipCompleted: vipCount,
      normalCompleted: normalCount,
      activeBots: this.bots.length,
      pendingOrders: this.pendingOrders.length,
    };
  }
}

module.exports = { Order, Bot, OrderController };
