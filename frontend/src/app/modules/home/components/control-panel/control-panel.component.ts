import { Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideMinus } from '@ng-icons/lucide';
import { OrderService } from '../../../../core/services/order.service';
import { OrderType } from '../../../../core/enums/order-type.enum';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [NgIconComponent],
  viewProviders: [provideIcons({ lucidePlus, lucideMinus })],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.css'
})
export class ControlPanelComponent {
  orderService = inject(OrderService);

  addNormalOrder() {
    this.orderService.addOrder(OrderType.NORMAL);
  }

  addVipOrder() {
    this.orderService.addOrder(OrderType.VIP);
  }

  addBot() {
    this.orderService.addBot();
  }

  removeBot() {
    this.orderService.removeBot();
  }
}
