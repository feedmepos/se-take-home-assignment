import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideBot, lucideInbox } from '@ng-icons/lucide';
import { OrderService } from '../../../../core/services/order.service';
import { BotStatus } from '../../../../core/enums/bot-status.enum';
import { OrderType } from '../../../../core/enums/order-type.enum';

@Component({
  selector: 'app-bot-board',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ lucideBot, lucideInbox })],
  templateUrl: './bot-board.component.html',
  styleUrl: './bot-board.component.css'
})
export class BotBoardComponent {
  orderService = inject(OrderService);
  BotStatus = BotStatus;
  OrderType = OrderType;
}
