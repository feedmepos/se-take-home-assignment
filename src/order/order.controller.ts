import { Body, Controller, Get, Post } from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderType } from "./order.types";
import { BotService } from "../bot/bot.service";

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orders: OrderService,
    private readonly bots: BotService
  ) { }

  @Post()
  create(@Body('type') type: OrderType) {
    const order = this.orders.createOrder(type);
    this.bots.onNewOrder();
    return order;
  }

  @Get('pending')
  getPending() {
    return this.orders.getPending();
  }

  @Get('completed')
  getCompleted() {
    return this.orders.getCompleted();
  }
}

