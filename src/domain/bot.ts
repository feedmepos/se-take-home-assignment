import { Bot, BOT_STATUS, Order } from "./types";

export function createBot(id: number, createdAt: number): Bot {
  return {
    id,
    status: BOT_STATUS.IDLE,
    currentOrder: null,
    busyUntil: null,
    createdAt,
    lastIdleAnnouncement: null,
  };
}

export function assignOrderToBot(
  bot: Bot,
  order: Order,
  busyUntil: number
): void {
  bot.status = BOT_STATUS.PROCESSING;
  bot.currentOrder = order;
  bot.busyUntil = busyUntil;
  bot.lastIdleAnnouncement = null;
}

export function resetBot(bot: Bot): void {
  bot.status = BOT_STATUS.IDLE;
  bot.currentOrder = null;
  bot.busyUntil = null;
}
