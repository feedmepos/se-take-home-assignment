import { Controller, Delete, Get, Post } from "@nestjs/common";
import { BotService } from "../bot/bot.service";

@Controller('bots')
export class BotController {
  constructor(private readonly bots: BotService) { }

  @Post()
  addBot() {
    this.bots.addBot();
    this.bots.onNewOrder();
    return { ok: true };
  }

  @Delete()
  removeBot() {
    this.bots.removeBot();
    return { ok: true };
  }

  @Get()
  getBots() {
    return this.bots.getBots();
  }
}
