import { Component, inject } from '@angular/core';
import { ORDER_STATUS_MAP, OrderStatus, OrderTier } from '../core/constants/order.constants';
import { OrderService } from '../core/services/order.service';
import { IOrderResponse } from '../core/models/order.model';

@Component({
    selector: 'app-root',
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    private orderService = inject(OrderService);

    ORDER_STATUS_MAP = ORDER_STATUS_MAP;

    OrderStatus = OrderStatus;
    OrderTier = OrderTier;

    allOrders = this.orderService.allOrders;

    addOrder(type: OrderTier): void {
        this.orderService.addOrder(type);
    }

    getOrdersByStatus(status: OrderStatus): IOrderResponse[] {
        return this.allOrders().filter((order) => order.status === status);
    }
}
