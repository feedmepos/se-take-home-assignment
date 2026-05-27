import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseFilters,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { OrderController } from '../domain/order-controller';
import { CreateOrderDto } from './dto';
import { serializeOrder } from './serialize';
import { BotNotFoundFilter } from './not-found.filter';
import type { OrderDTO, OrderType } from '@shared/contracts';

class OrderTypeQuery {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['NORMAL', 'VIP'])
  type?: OrderType;
}

@Controller('orders')
@UseFilters(BotNotFoundFilter)
export class OrdersController {
  constructor(private readonly domain: OrderController) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addOrder(@Body() dto: CreateOrderDto): Promise<OrderDTO> {
    const order = this.domain.addOrder(dto.type ?? 'NORMAL');
    return serializeOrder(order);
  }

  @Get()
  async listOrders(@Query('type') rawType?: string): Promise<OrderDTO[]> {
    let type: OrderType | undefined;
    if (rawType !== undefined) {
      const query = plainToInstance(OrderTypeQuery, { type: rawType });
      const errors = await validate(query);
      if (errors.length > 0) {
        throw new BadRequestException('type must be NORMAL or VIP');
      }
      type = query.type;
    }
    return this.domain.listOrders(type).map(serializeOrder);
  }
}
