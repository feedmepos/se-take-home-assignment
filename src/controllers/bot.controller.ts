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
        this.logger?.log(`Bot #${bot.id} created - Status: ACTIVE`);
        this.processNext(bot);

        return bot;
    }

    removeBot(id: number) {
        const index = bots.findIndex((bot) => bot.id === id);

        if (index === -1) {
            return undefined;
        }

        const [bot] = bots.splice(index, 1);

        if (!bot) {
            return undefined;
        }

        const status = bot.status;
        this.stopProcessing(bot);
        this.logger?.log(`Bot #${bot.id} destroyed while ${status}`);

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
                this.logger?.log(`Bot #${bot.id} completed ${order.customer} Order #${order.id} - Status: COMPLETE (Processing time: ${PROCESS_DURATION_MS / 1000}s)`);
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
