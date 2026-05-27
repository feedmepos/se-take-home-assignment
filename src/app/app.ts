import { Component, inject } from '@angular/core';
import { OrderTier } from '../core/constants/order.constants';
import { OrderService } from '../core/services/order.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    private orderService = inject(OrderService);

    OrderTier = OrderTier;

    allOrders = this.orderService.allOrders;

    addOrder(type: OrderTier): void {
        this.orderService.addOrder(type);
    }
}
