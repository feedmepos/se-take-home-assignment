import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseFilters,
  ParseIntPipe,
} from '@nestjs/common';
import { OrderController } from '../domain/order-controller';
import { serializeBot } from './serialize';
import { BotNotFoundFilter } from './not-found.filter';
import type { BotDTO } from '../contracts';

@Controller('bots')
@UseFilters(BotNotFoundFilter)
export class BotsController {
  constructor(private readonly domain: OrderController) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addBot(): BotDTO {
    return serializeBot(this.domain.addBot());
  }

  @Get()
  listBots(): BotDTO[] {
    return this.domain.listBots().map(serializeBot);
  }

  @Delete(':id')
  removeBot(@Param('id', ParseIntPipe) id: number): BotDTO {
    return serializeBot(this.domain.removeBot(id));
  }

  @Delete()
  removeBotLatest(): BotDTO {
    return serializeBot(this.domain.removeBot());
  }
}
