"use strict";

const DEFAULT_COOK_SECONDS = 10;
const ORDER_KINDS = Object.freeze({
  NORMAL: "Normal",
  VIP: "VIP",
});

function getCurrentTimeLabel(date = new Date()) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function parseTime(value) {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(`Invalid time "${value}". Expected HH:MM:SS.`);
  }

  const [, hours, minutes, seconds] = match.map(Number);

  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new Error(`Invalid time "${value}". Expected HH:MM:SS.`);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(totalSeconds) {
  const daySeconds = 24 * 3600;
  const normalized = ((totalSeconds % daySeconds) + daySeconds) % daySeconds;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function orderPriority(kind) {
  return kind === ORDER_KINDS.VIP ? 0 : 1;
}

function compareOrders(first, second) {
  return (
    orderPriority(first.kind) - orderPriority(second.kind) ||
    first.id - second.id
  );
}

function formatOrder(order) {
  return `#${order.id}(${order.kind})`;
}

function formatOrderList(orders) {
  return orders.length === 0 ? "[]" : `[${orders.map(formatOrder).join(", ")}]`;
}

class OrderController {
  constructor(options = {}) {
    this.cookSeconds = options.cookSeconds ?? DEFAULT_COOK_SECONDS;
    this.currentSecond = parseTime(options.startTime ?? getCurrentTimeLabel());
    this.nextOrderId = 1;
    this.nextBotId = 1;
    this.pending = [];
    this.completed = [];
    this.bots = [];
    this.events = [];
  }

  createOrder(kind) {
    this.assertOrderKind(kind);

    const order = {
      id: this.nextOrderId,
      kind,
    };

    this.nextOrderId += 1;
    this.insertPendingOrder(order);
    this.log(`Created ${kind} order #${order.id}`);
    this.assignPendingOrders();

    return order;
  }

  addBot() {
    const bot = {
      id: this.nextBotId,
      job: null,
    };

    this.nextBotId += 1;
    this.bots.push(bot);
    this.log(`Added bot #${bot.id}`);
    this.assignPendingOrders();

    return bot;
  }

  removeLatestBot() {
    const bot = this.bots.pop();

    if (!bot) {
      this.log("No bot available to remove");
      return null;
    }

    if (bot.job) {
      this.insertPendingOrder(bot.job.order);
      this.log(
        `Removed bot #${bot.id}; returned order #${bot.job.order.id} to pending`,
      );
    } else {
      this.log(`Removed idle bot #${bot.id}`);
    }

    return bot;
  }

  tick(seconds = 1) {
    if (!Number.isInteger(seconds) || seconds < 0) {
      throw new Error("tick seconds must be a non-negative integer.");
    }

    const targetSecond = this.currentSecond + seconds;

    while (true) {
      const nextFinishSecond = this.getNextFinishSecond(targetSecond);

      if (nextFinishSecond === null) {
        this.currentSecond = targetSecond;
        return;
      }

      this.currentSecond = nextFinishSecond;
      this.completeFinishedJobs();
      this.assignPendingOrders();
    }
  }

  status() {
    const cooking = this.bots
      .filter((bot) => bot.job !== null)
      .map((bot) => `bot #${bot.id}->${formatOrder(bot.job.order)}`);
    const idle = this.bots.filter((bot) => bot.job === null).map((bot) => bot.id);

    return [
      `time=${this.timeLabel()}`,
      `pending=${formatOrderList(this.pending)}`,
      `cooking=${cooking.length === 0 ? "[]" : `[${cooking.join(", ")}]`}`,
      `completed=${formatOrderList(this.completed.map((item) => item.order))}`,
      `idleBots=${idle.length === 0 ? "[]" : `[${idle.join(", ")}]`}`,
    ].join(" ");
  }

  snapshot() {
    return {
      time: this.timeLabel(),
      nextOrderId: this.nextOrderId,
      nextBotId: this.nextBotId,
      pending: this.pending.map((order) => ({ ...order })),
      completed: this.completed.map((item) => ({
        order: { ...item.order },
        completedAt: item.completedAt,
      })),
      bots: this.bots.map((bot) => ({
        id: bot.id,
        job: bot.job
          ? {
              order: { ...bot.job.order },
              startedAt: bot.job.startedAt,
              finishesAt: bot.job.finishesAt,
            }
          : null,
      })),
      events: [...this.events],
    };
  }

  output() {
    return [...this.events, `[${this.timeLabel()}] ${this.status()}`].join("\n");
  }

  assertOrderKind(kind) {
    if (kind !== ORDER_KINDS.NORMAL && kind !== ORDER_KINDS.VIP) {
      throw new Error(`Unsupported order kind "${kind}".`);
    }
  }

  insertPendingOrder(order) {
    this.pending = [...this.pending, order].sort(compareOrders);
  }

  assignPendingOrders() {
    for (const bot of this.bots) {
      if (bot.job !== null || this.pending.length === 0) {
        continue;
      }

      const order = this.pending.shift();
      bot.job = {
        order,
        startedAt: this.timeLabel(),
        finishesAt: this.currentSecond + this.cookSeconds,
      };
      this.log(
        `Bot #${bot.id} started order #${order.id}; completes at ${formatTime(
          bot.job.finishesAt,
        )}`,
      );
    }
  }

  getNextFinishSecond(targetSecond) {
    const finishTimes = this.bots
      .map((bot) => bot.job?.finishesAt)
      .filter((finishesAt) => finishesAt !== undefined && finishesAt <= targetSecond);

    if (finishTimes.length === 0) {
      return null;
    }

    return Math.min(...finishTimes);
  }

  completeFinishedJobs() {
    for (const bot of this.bots) {
      if (!bot.job || bot.job.finishesAt !== this.currentSecond) {
        continue;
      }

      const order = bot.job.order;
      this.completed.push({
        order,
        completedAt: this.timeLabel(),
      });
      bot.job = null;
      this.log(`Completed order #${order.id} by bot #${bot.id}`);
    }
  }

  log(message) {
    this.events.push(`[${this.timeLabel()}] ${message}`);
  }

  timeLabel() {
    return formatTime(this.currentSecond);
  }
}

function runDemoScenario(options = {}) {
  const controller = new OrderController(options);

  controller.addBot();
  controller.createOrder(ORDER_KINDS.NORMAL);
  controller.createOrder(ORDER_KINDS.NORMAL);
  controller.createOrder(ORDER_KINDS.VIP);
  controller.tick(10);
  controller.tick(10);
  controller.addBot();
  controller.createOrder(ORDER_KINDS.VIP);
  controller.createOrder(ORDER_KINDS.NORMAL);
  controller.removeLatestBot();
  controller.tick(30);

  return controller.output();
}

module.exports = {
  DEFAULT_COOK_SECONDS,
  ORDER_KINDS,
  OrderController,
  compareOrders,
  formatTime,
  getCurrentTimeLabel,
  parseTime,
  runDemoScenario,
};
