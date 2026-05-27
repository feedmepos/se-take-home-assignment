import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import { OrderController } from '../domain/order-controller';
import { serializeBot } from './serialize';
import { BotNotFoundFilter } from './not-found.filter';
import type { BotDTO } from '@shared/contracts';

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
  removeBot(@Param('id') id: string): BotDTO {
    const numId = parseInt(id, 10);
    return serializeBot(this.domain.removeBot(numId));
  }

  @Delete()
  removeBotLatest(): BotDTO {
    return serializeBot(this.domain.removeBot());
  }
}
