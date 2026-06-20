import { BotController } from "../controllers";
import { Bot, Order } from "../models";

export const formatOrders = (orders: Order[]) => {
    if (orders.length === 0) {
        return "(no orders yet)";
    }

    return orders
        .map((order) => `#${order.id}  ${order.customer.padEnd(6)}  ${order.status}`)
        .join("\n");
};

export const formatBots = (bots: Bot[]) => {
    if (bots.length === 0) {
        return "(no bots yet)";
    }

    return bots
        .map((bot) => {
            const orderSuffix = bot.currentOrderId !== undefined ? ` (Order #${bot.currentOrderId})` : "";
            return `#${bot.id}  ${bot.status}${orderSuffix}`;
        })
        .join("\n");
};

export const formatStats = (botController: BotController) => {
    const orders = botController.orderController.findAll();
    const bots = botController.findAll();
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const processing = orders.filter((o) => o.status === "PROCESSING").length;
    const complete = orders.filter((o) => o.status === "COMPLETE").length;

    return `Bots: ${bots.length}   Orders: ${orders.length} total / ${pending} pending / ${processing} processing / ${complete} complete`;
};
