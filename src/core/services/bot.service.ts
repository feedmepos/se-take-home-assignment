import { Injectable, inject, signal } from '@angular/core';
import { BotStatus, IBotResponse } from '../models/bot.model';
import { OrderService } from './order.service';

@Injectable({
    providedIn: 'root',
})
export class BotService {
    private orderService = inject(OrderService);

    bots = signal<IBotResponse[]>([]);

    addBot(): void {
        const lastBot = this.bots()[this.bots().length - 1];
        const newBot = {
            id: lastBot ? lastBot.id + 1 : 1,
            status: BotStatus.Idle,
        };

        this.bots.update((existing) => [...existing, newBot]);
        this.processPendingOrders();
    }

    processPendingOrders(): void {
        this.bots()
            .filter((bot) => bot.status === BotStatus.Idle)
            .forEach((bot) => this.processNextOrder(bot.id));
    }

    removeBot(): void {
        const newestBot = this.bots()[this.bots().length - 1];

        if (!newestBot) {
            return;
        }

        if (newestBot.timerId) {
            clearTimeout(newestBot.timerId);
        }

        if (newestBot.orderId) {
            this.orderService.returnProcessingOrder(newestBot.orderId);
        }

        this.bots.update((existing) => existing.filter((bot) => bot.id !== newestBot.id));
        this.processPendingOrders();
    }

    private processNextOrder(botId: number): void {
        const bot = this.bots().find((existingBot) => existingBot.id === botId);

        if (!bot || bot.status !== BotStatus.Idle) {
            return;
        }

        const order = this.orderService.pickPendingOrder(botId);

        if (!order) {
            this.updateBot(botId, {
                status: BotStatus.Idle,
                orderId: undefined,
                timerId: undefined,
            });
            return;
        }

        const timerId = setTimeout(() => {
            this.orderService.completeProcessingOrder(order.id);
            this.updateBot(botId, {
                status: BotStatus.Idle,
                orderId: undefined,
                timerId: undefined,
            });
            this.processNextOrder(botId);
        }, 10000);

        this.updateBot(botId, {
            status: BotStatus.Processing,
            orderId: order.id,
            timerId,
        });
    }

    private updateBot(botId: number, update: Partial<IBotResponse>): void {
        this.bots.update((existing) =>
            existing.map((bot) => (bot.id === botId ? { ...bot, ...update } : bot)),
        );
    }
}
