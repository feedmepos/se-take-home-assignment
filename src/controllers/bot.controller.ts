import { PROCESS_DURATION_MS } from "../constants";
import { Logger } from "../libs";
import { Bot } from "../models";
import { bots } from "../stores";
import { OrderController } from "./order.controller";

export class BotController {
    readonly orderController: OrderController;
    private nextId = 1;
    private timers = new Map<number, NodeJS.Timeout>();

    constructor(private logger?: Logger) {
        this.orderController = new OrderController(logger);
        this.orderController.onOrderCreated(() => this.wakeIdleBots());
    }

    addBot() {
        const bot: Bot = {
            id: this.nextId++,
            status: "IDLE",
        };

        bots.push(bot);
        this.logger?.log(`Bot #${bot.id} created`);
        this.processNext(bot);

        return bot;
    }

    removeBot() {
        const bot = bots.pop();

        if (!bot) {
            return undefined;
        }

        this.stopProcessing(bot);
        this.logger?.log(`Bot #${bot.id} destroyed`);

        return bot;
    }

    findAll() {
        return bots;
    }

    private wakeIdleBots() {
        for (const bot of bots) {
            if (bot.status === "IDLE") {
                this.processNext(bot);
            }
        }
    }

    private processNext(bot: Bot) {
        const [order] = this.orderController.findAll({ status: "PENDING" });

        if (!order) {
            bot.status = "IDLE";
            this.logger?.log(`Bot #${bot.id} is now IDLE - No pending orders`);
            return;
        }

        this.orderController.update(order.id, { status: "PROCESSING" });
        bot.status = "PROCESSING";
        bot.currentOrderId = order.id;
        this.logger?.log(`Bot #${bot.id} picked up ${order.customer} Order #${order.id} - Status: PROCESSING`);

        const timer = setTimeout(() => this.completeOrder(bot), PROCESS_DURATION_MS);
        this.timers.set(bot.id, timer);
    }

    private completeOrder(bot: Bot) {
        if (bot.currentOrderId !== undefined) {
            const order = this.orderController.update(bot.currentOrderId, { status: "COMPLETE" });

            if (order) {
                this.logger?.log(`Bot #${bot.id} completed ${order.customer} Order #${order.id} - Status: COMPLETE`);
            }
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
            const order = this.orderController.update(bot.currentOrderId, { status: "PENDING" });

            if (order) {
                this.logger?.log(`Order #${order.id} returned to PENDING (Bot #${bot.id} removed)`);
            }

            bot.currentOrderId = undefined;
        }
    }
}
