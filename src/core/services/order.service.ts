import { computed, Injectable, signal } from '@angular/core';
import { OrderStatus, OrderTier } from '../constants/order.constants';
import { IOrderResponse } from '../models/order.model';

@Injectable({
    providedIn: 'root',
})
export class OrderService {
    normalOrder = signal<IOrderResponse[]>([]);
    vipOrder = signal<IOrderResponse[]>([]);
    allOrders = computed(() => [...this.vipOrder(), ...this.normalOrder()]);

    addOrder(type: OrderTier): void {
        const targetOrderGroup = type === OrderTier.Normal ? this.normalOrder : this.vipOrder;

        const lastOrder = targetOrderGroup()[targetOrderGroup().length - 1];
        const newId = lastOrder ? lastOrder.id + 1 : 1;

        const newOrder = {
            id: newId,
            name: `${OrderTier.Normal ? 'Normal' : 'VIP'} Order #${newId}`,
            tier: type,
            status: OrderStatus.Pending,
        };

        targetOrderGroup.update((existing) => [...existing, newOrder]);
    }
}
