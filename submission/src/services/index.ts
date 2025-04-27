import Bot from "@/models/bot";
import Order from "@/models/order";
import BotAllocationService from "./bot-allocation";
import OrderService from "./order";
import OrderDispatchService from "./order-dispatch";

/**
 * This is for the purpose of quick setup, ideally we should use a DI library like Inversify.
 */

export const persistenceOrders: Map<number, Order> = new Map();
export const persistenceBots: Map<number, Bot> = new Map();
export const botAllocationService = new BotAllocationService(persistenceBots);
export const orderDispatchService = new OrderDispatchService(
  botAllocationService,
);
export const orderService = new OrderService(
  persistenceOrders,
  orderDispatchService,
);

export function reset() {
  persistenceOrders.clear();
  persistenceBots.clear();
  orderDispatchService.reset();
}
