import { Body, Controller, Get, Post, BadRequestException } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { BotService } from '../bot/bot.service';
import { OrderType } from './order.types';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly botService: BotService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order', description: 'Creates a NORMAL or VIP order. VIP orders are placed ahead of all NORMAL orders in the queue.' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created and added to PENDING queue.' })
  @ApiResponse({ status: 400, description: 'Invalid type — must be NORMAL or VIP.' })
  createOrder(@Body() body: CreateOrderDto) {
    const type = body?.type?.toUpperCase();
    if (type !== OrderType.NORMAL && type !== OrderType.VIP) {
      throw new BadRequestException('type must be NORMAL or VIP');
    }
    const order = this.orderService.createOrder(type as OrderType);
    this.botService.notifyNewOrder();
    return order;
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending queue', description: 'Returns all orders currently in the PENDING queue, in processing priority order (VIP first, then NORMAL).' })
  @ApiResponse({ status: 200, description: 'Ordered list of pending orders.' })
  getPending() {
    return this.orderService.getPendingQueue();
  }

  @Get('complete')
  @ApiOperation({ summary: 'Get completed orders', description: 'Returns all orders that have been fully processed, in completion order.' })
  @ApiResponse({ status: 200, description: 'List of completed orders with timestamps.' })
  getComplete() {
    return this.orderService.getCompletedOrders();
  }
}
