// src/orderController.js

class OrderController {
  constructor(processingTimeSec = 10) {
    this.timeSec = 0;
    this.processingTimeSec = processingTimeSec;

    this.nextOrderId = 1;
    this.nextBotId = 1;

    this.pendingVip = [];
    this.pendingNormal = [];

    this.orders = new Map(); // id -> order
    this.bots = [];          // [{ id, status, currentOrderId, busyUntil }]

    this.logs = [];
  }

  // ---------- Logging helpers ----------

  formatTime(sec) {
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  // Timestamped log
  log(message) {
    this.logs.push(`[${this.formatTime(this.timeSec)}] ${message}`);
  }

  // Plain log (no timestamp), for headers / summaries
  logPlain(message) {
    this.logs.push(message);
  }

  getLogs() {
    return this.logs.slice();
  }

  // ---------- Orders ----------

  createOrder(type) {
    const id = this.nextOrderId++;
    const order = {
      id,
      type, // "VIP" or "NORMAL"
      status: "PENDING", // "PENDING" | "PROCESSING" | "COMPLETE"
      createdAt: this.timeSec,
      startedAt: null,
      completedAt: null,
      assignedBotId: null
    };

    this.orders.set(id, order);

    if (type === "VIP") {
      // VIP queue: all VIPs before Normal, FIFO within VIP
      this.pendingVip.push(order);
      this.log(`Created VIP Order #${id} - Status: PENDING`);
    } else {
      this.pendingNormal.push(order);
      this.log(`Created Normal Order #${id} - Status: PENDING`);
    }

    // If there are idle bots, they should pick up work immediately
    this._assignOrdersToIdleBots();

    return order;
  }

  createNormalOrder() {
    return this.createOrder("NORMAL");
  }

  createVipOrder() {
    return this.createOrder("VIP");
  }

  // ---------- Bots ----------

  addBot() {
    const id = this.nextBotId++;
    const bot = {
      id,
      status: "IDLE",       // "IDLE" | "BUSY"
      currentOrderId: null,
      busyUntil: null
    };

    this.bots.push(bot);
    this.log(`Bot #${id} created - Status: IDLE`);

    this._assignOrdersToIdleBots();
    return bot;
  }

  removeBot() {
    if (this.bots.length === 0) {
      this.log("No bots to remove");
      return null;
    }

    const bot = this.bots[this.bots.length - 1];
    this.bots.pop();

    if (bot.currentOrderId != null) {
      // Bot was BUSY: return order to PENDING
      const order = this.orders.get(bot.currentOrderId);
      if (order) {
        order.status = "PENDING";
        order.assignedBotId = null;
        order.startedAt = null;
        order.completedAt = null;

        if (order.type === "VIP") {
          // Return to front of VIP queue
          this.pendingVip.unshift(order);
        } else {
          this.pendingNormal.unshift(order);
        }

        this.log(
          `Bot #${bot.id} destroyed while BUSY - Order #${order.id} returned to PENDING`
        );
      } else {
        this.log(`Bot #${bot.id} destroyed while BUSY (order missing)`);
      }

      // Other idle bots may pick this up
      this._assignOrdersToIdleBots();
    } else {
      this.log(`Bot #${bot.id} destroyed while IDLE`);
    }

    return bot;
  }

  // ---------- Time & processing ----------

  advanceTimeTo(targetSec) {
    if (targetSec < this.timeSec) {
      throw new Error("Cannot go back in time");
    }

    // Process all completions up to targetSec
    while (true) {
      const nextFinish = this._nextCompletionTime();
      if (nextFinish === null || nextFinish > targetSec) {
        break;
      }

      // Move time to the next completion point
      this.timeSec = nextFinish;

      // Complete all bots finishing exactly now
      for (const bot of this.bots) {
        if (bot.busyUntil === this.timeSec && bot.currentOrderId != null) {
          const order = this.orders.get(bot.currentOrderId);
          if (order) {
            order.status = "COMPLETE";
            order.completedAt = this.timeSec;
            this.log(
              `Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: COMPLETE (Processing time: ${this.processingTimeSec}s)`
            );
          }
          bot.status = "IDLE";
          bot.currentOrderId = null;
          bot.busyUntil = null;
        }
      }

      // Newly idle bots should pick up new work if available
      this._assignOrdersToIdleBots();
    }

    // Finally, move to requested time
    this.timeSec = targetSec;
  }

  _nextCompletionTime() {
    let t = null;
    for (const bot of this.bots) {
      if (bot.busyUntil != null && bot.busyUntil > this.timeSec) {
        if (t === null || bot.busyUntil < t) {
          t = bot.busyUntil;
        }
      }
    }
    return t;
  }

  _dequeueNextPendingOrder() {
    if (this.pendingVip.length > 0) {
      return this.pendingVip.shift();
    }
    if (this.pendingNormal.length > 0) {
      return this.pendingNormal.shift();
    }
    return null;
  }

  _assignOrdersToIdleBots() {
    for (const bot of this.bots) {
      if (bot.status === "IDLE") {
        const order = this._dequeueNextPendingOrder();
        if (!order) {
          continue;
        }
        bot.status = "BUSY";
        bot.currentOrderId = order.id;
        bot.busyUntil = this.timeSec + this.processingTimeSec;

        order.status = "PROCESSING";
        order.assignedBotId = bot.id;
        order.startedAt = this.timeSec;

        this.log(
          `Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`
        );
      }
    }
  }

  // ---------- Summary ----------

  logFinalSummary() {
    let total = 0;
    let vipCount = 0;
    let normalCount = 0;
    let completed = 0;
    let pending = 0;
    let processing = 0;

    for (const order of this.orders.values()) {
      total += 1;
      if (order.type === "VIP") vipCount += 1;
      if (order.type === "NORMAL") normalCount += 1;

      if (order.status === "COMPLETE") completed += 1;
      if (order.status === "PENDING") pending += 1;
      if (order.status === "PROCESSING") processing += 1;
    }

    this.logs.push("");
    this.logs.push("Final Status:");
    this.logs.push(
      `- Total Orders Created: ${total} (${vipCount} VIP, ${normalCount} Normal)`
    );
    this.logs.push(`- Orders Completed: ${completed}`);
    this.logs.push(`- Orders Processing: ${processing}`);
    this.logs.push(`- Pending Orders: ${pending}`);
    this.logs.push(`- Active Bots: ${this.bots.length}`);
  }
}

module.exports = { OrderController };
