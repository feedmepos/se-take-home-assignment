import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle2, lucideInbox } from '@ng-icons/lucide';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-complete-board',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ lucideCheckCircle2, lucideInbox })],
  templateUrl: './complete-board.component.html',
  styleUrl: './complete-board.component.css'
})
export class CompleteBoardComponent {
  orderService = inject(OrderService);
}
