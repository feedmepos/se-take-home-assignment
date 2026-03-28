import type { Order } from "./orderQueue.js";
import { log as logger } from "./log.js";

const DEFAULT_PROCESSING_TIME_MS = 10_000;

interface Bot {
  id: number;
  currentOrder: Order | null;
  timer: NodeJS.Timeout | null;
}

interface OrderQueue {
  getNextOrder(): Order | null;
  completeOrder(order: Order): void;
  returnOrder(order: Order): void;
}

export const newBotManager = (
  log: typeof logger,
  processingTimeMs: number = DEFAULT_PROCESSING_TIME_MS,
) => {
  const bots: Bot[] = [];
  let nextId = 1;

  function _label(order: Order) {
    return `${order.type === "normal" ? "Normal" : "VIP"} Order #${order.id}`;
  }

  const _processNextOrder = (bot: Bot, queue: OrderQueue) => {
    const nextOrder = queue.getNextOrder();

    if (!nextOrder) {
      bot.currentOrder = null;
      bot.timer = null;
      log(`Bot #${bot.id} is now IDLE - No pending orders`)
      return;
    }

    bot.currentOrder = nextOrder;
    log(`Bot #${bot.id} picked up ${_label(nextOrder)} — STATUS: PROCESSING`);

    bot.timer = setTimeout(() => {
      queue.completeOrder(nextOrder);
      bot.currentOrder = null;
      bot.timer = null;
      log(`Bot #${bot.id} completed ${_label(nextOrder)} — STATUS: COMPLETED (Processing time: ${processingTimeMs / 1000}s)`);
      _processNextOrder(bot, queue);
    }, processingTimeMs);
  };

  return {
    addBot(queue: OrderQueue) {
      const newBot: Bot = {
        id: nextId++,
        currentOrder: null,
        timer: null,
      };

      bots.push(newBot);
      log(`Bot #${newBot.id} created - Status: ACTIVE`);
      _processNextOrder(newBot, queue);

      return newBot;
    },
    removeBot(queue: OrderQueue) {
      const bot = bots.pop();

      if (bot === undefined) {
        log("No bots to remove");
        return null;
      }

      if (bot?.timer) {
        clearTimeout(bot.timer);
        bot.timer = null;
      }

      if (bot?.currentOrder) {
        const order = bot.currentOrder;
        bot.currentOrder = null;
        queue.returnOrder(order);

        log(
          `Bot #${bot.id} destroyed — Order #${order.id} returned to PENDING`,
        );
        this.pingIdleBot(queue);

        return bot;
      }

      log(`Bot #${bot.id} destroyed while IDLE`);

      return bot;
    },
    peekBot() {
      return bots[0];
    },
    botCount() {
      return bots.length;
    },
    pingIdleBot(queue: OrderQueue) {
      const idleBot = bots.find((bot) => bot.currentOrder === null);

      if (idleBot) {
        _processNextOrder(idleBot, queue);
      }
    },
    getState() {
      return bots.map((b) => ({
        id: b.id,
        status: b.currentOrder ? "busy" : "idle",
        currentOrderId: b.currentOrder?.id ?? null,
      }))
    }
  };
};
