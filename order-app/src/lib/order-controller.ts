import { Bot, Order, OrderStatus, OrderType } from "@/lib/types";
import { OrderQueue } from "@/lib/order-queue";
import { BotWorker } from "@/lib/bot.worker";

const queue = new OrderQueue();
export const worker = new BotWorker(queue);

worker.start();

let orderId = 1;

export const controller = {
  createOrder(type: OrderType) {
    const order = {
      id: orderId++,
      type,
      status: OrderStatus.PENDING,
    };

    queue.enqueue(order);
    return order;
  },

  addBot() {
    return worker.addBot();
  },

  removeBot() {
    return worker.removeBot();
  },

  getState() {
    return worker.getState();
  },

  resetSystem() {
    queue.clear();
    worker.clearBots();
    worker.clearCompletedOrders();

    orderId = 1;
  }
};