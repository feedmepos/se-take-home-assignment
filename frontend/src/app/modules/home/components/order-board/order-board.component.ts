import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideInbox } from '@ng-icons/lucide';
import { OrderService } from '../../../../core/services/order.service';
import { OrderType } from '../../../../core/enums/order-type.enum';

@Component({
  selector: 'app-order-board',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ lucideClock, lucideInbox })],
  templateUrl: './order-board.component.html',
  styleUrl: './order-board.component.css'
})
export class OrderBoardComponent {
  orderService = inject(OrderService);
  OrderType = OrderType;
}
