import { Controller, Get, Param, Post } from '@nestjs/common';
import { OrderType } from './enums/order-type.enum';
import { OrderService } from './order.service';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('normal')
  createNormalOrder() {
    return this.orderService.create(OrderType.NORMAL);
  }

  @Post('vip')
  createVipOrder() {
    return this.orderService.create(OrderType.VIP);
  }

  @Get()
  getAllOrders() {
    return {
      orders: this.orderService.getAll(),
      count: this.orderService.getCount(),
    };
  }

  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.orderService.getById(Number(id));
  }
}
