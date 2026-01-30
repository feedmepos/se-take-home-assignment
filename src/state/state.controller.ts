import { Controller, Get } from "@nestjs/common";
import { OrderService } from "../order/order.service";
import { BotService } from "../bot/bot.service";

@Controller()
export class StateController {
  constructor(
    private readonly orders: OrderService,
    private readonly bots: BotService,
  ) {}

  @Get('state')
  getState() {
    return {
      pending: this.orders.getPending(),
      completed: this.orders.getCompleted(),
      bots: this.bots.getBots(),
    };
  }
}
