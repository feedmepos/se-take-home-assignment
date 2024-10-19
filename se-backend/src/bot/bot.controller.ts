import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, ValidationPipe } from '@nestjs/common';
import { OrderService } from 'src/order/order.service';
import { CreateOrderDto } from 'src/order/dto/create-order-dto';

@Controller('bot')
export class BotController {
}
