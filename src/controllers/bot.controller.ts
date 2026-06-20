import { PROCESS_DURATION_MS } from "../constants";
import { Bot } from "../models";
import { bots } from "../stores";
import { OrderController } from "./order.controller";

export class BotController {
    private nextId = 1;
    private timers = new Map<number, NodeJS.Timeout>();
    private orderController = new OrderController();

    addBot() {
        const bot: Bot = {
            id: this.nextId++,
            status: "IDLE",
        };

        bots.push(bot);
        this.processNext(bot);

        return bot;
    }

    removeBot() {
        const bot = bots.pop();

        if (!bot) {
            return undefined;
        }

        this.stopProcessing(bot);

        return bot;
    }

    findAll() {
        return bots;
    }

    private processNext(bot: Bot) {
        const [order] = this.orderController.findAll({ status: "PENDING" });

        if (!order) {
            bot.status = "IDLE";
            return;
        }

        this.orderController.update(order.id, { status: "PROCESSING" });
        bot.status = "PROCESSING";
        bot.currentOrderId = order.id;

        const timer = setTimeout(() => this.completeOrder(bot), PROCESS_DURATION_MS);
        this.timers.set(bot.id, timer);
    }

    private completeOrder(bot: Bot) {
        if (bot.currentOrderId !== undefined) {
            this.orderController.update(bot.currentOrderId, { status: "COMPLETE" });
        }

        this.timers.delete(bot.id);
        bot.currentOrderId = undefined;

        this.processNext(bot);
    }

    private stopProcessing(bot: Bot) {
        const timer = this.timers.get(bot.id);

        if (timer) {
            clearTimeout(timer);
            this.timers.delete(bot.id);
        }

        if (bot.currentOrderId !== undefined) {
            this.orderController.update(bot.currentOrderId, { status: "PENDING" });
        }
    }
}
