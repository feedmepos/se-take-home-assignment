import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideMinus, lucideClock } from '@ng-icons/lucide';
import { OrderService } from '../../../../core/services/order.service';
import { OrderType } from '../../../../core/enums/order-type.enum';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ lucidePlus, lucideMinus, lucideClock })],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.css'
})
export class ControlPanelComponent implements OnInit, OnDestroy {
  orderService = inject(OrderService);
  currentTime: Date = new Date();
  private timer: any;

  ngOnInit() {
    this.timer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

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
