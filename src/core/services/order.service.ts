import { Injectable, signal } from '@angular/core';
import { OrderStatus, OrderTier } from '../constants/order.constants';
import { IOrderResponse } from '../models/order.model';

@Injectable({
    providedIn: 'root',
})
export class OrderService {
    allOrders = signal<IOrderResponse[]>([]);

    private nextOrderId = 1;

    addOrder(type: OrderTier): void {
        const newId = this.nextOrderId++;

        const newOrder = {
            id: newId,
            name: `${type === OrderTier.Normal ? 'Normal' : 'VIP'} Order ${newId}`,
            tier: type,
            status: OrderStatus.Pending,
        };

        this.allOrders.update((existing) => [...existing, newOrder]);
    }

    completeProcessingOrder(orderId: number): void {
        const order = this.allOrders().find(
            (existingOrder) =>
                existingOrder.id === orderId && existingOrder.status === OrderStatus.InProgress,
        );

        if (!order) {
            return;
        }

        this.allOrders.update((existing) =>
            existing.map((existingOrder) =>
                existingOrder.id === orderId
                    ? {
                          ...existingOrder,
                          botId: undefined,
                          status: OrderStatus.Complete,
                      }
                    : existingOrder,
            ),
        );
    }

    pickPendingOrder(botId: number): IOrderResponse | undefined {
        const nextOrder = this.getPendingOrders()[0];

        if (!nextOrder) {
            return undefined;
        }

        const processingOrder: IOrderResponse = {
            ...nextOrder,
            botId,
            status: OrderStatus.InProgress,
        };

        this.allOrders.update((existing) =>
            existing.map((order) => (order.id === nextOrder.id ? processingOrder : order)),
        );
        return processingOrder;
    }

    returnProcessingOrder(orderId: number): void {
        const order = this.allOrders().find(
            (existingOrder) =>
                existingOrder.id === orderId && existingOrder.status === OrderStatus.InProgress,
        );

        if (!order) {
            return;
        }

        const pendingOrder = {
            ...order,
            botId: undefined,
            status: OrderStatus.Pending,
        };

        this.allOrders.update((existing) =>
            existing.map((existingOrder) =>
                existingOrder.id === orderId ? pendingOrder : existingOrder,
            ),
        );
    }

    getPendingOrders(): IOrderResponse[] {
        return this.allOrders()
            .filter((order) => order.status === OrderStatus.Pending)
            .sort((firstOrder, secondOrder) => {
                if (firstOrder.tier !== secondOrder.tier) {
                    return firstOrder.tier === OrderTier.Vip ? -1 : 1;
                }

                return firstOrder.id - secondOrder.id;
            });
    }
}
