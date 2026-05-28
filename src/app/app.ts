import { Component, inject } from '@angular/core';
import { ORDER_STATUS_MAP, OrderStatus, OrderTier } from '../core/constants/order.constants';
import { OrderService } from '../core/services/order.service';
import { IOrderResponse } from '../core/models/order.model';
import { BotStatus } from '../core/models/bot.model';
import { BotService } from '../core/services/bot.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    private orderService = inject(OrderService);
    private botService = inject(BotService);

    ORDER_STATUS_MAP = ORDER_STATUS_MAP;

    OrderStatus = OrderStatus;
    OrderTier = OrderTier;
    BotStatus = BotStatus;

    allOrders = this.orderService.allOrders;
    bots = this.botService.bots;

    addOrder(type: OrderTier): void {
        this.orderService.addOrder(type);
        this.botService.processPendingOrders();
    }

    addBot(): void {
        this.botService.addBot();
    }

    removeBot(): void {
        this.botService.removeBot();
    }

    getOrdersByStatus(status: OrderStatus): IOrderResponse[] {
        if (status === OrderStatus.Pending) {
            return this.orderService.getPendingOrders();
        }

        return this.allOrders().filter((order) => order.status === status);
    }

    getProcessingOrderByBot(botId: number): IOrderResponse | undefined {
        return this.getOrdersByStatus(OrderStatus.InProgress).find(
            (order) => order.botId === botId,
        );
    }
}
