import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { OrderType } from '../domain/orders/order.entity';
import { OrderService } from '../services/order.service';
import { BotService } from '../services/bot.service';
import { CreateOrderDto } from '../dto/create-order.dto';

@ApiTags('orders')
@Controller('api')
export class HttpController {
  constructor(
    private readonly orderService: OrderService,
    private readonly botService: BotService,
  ) {}

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order', tags: ['orders'] })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  createOrder(@Body() createOrderDto: CreateOrderDto) {
    const order = this.orderService.createOrder(createOrderDto.type);
    return order;
  }

  @Post('bots')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new bot', tags: ['bots'] })
  @ApiResponse({ status: 201, description: 'Bot added successfully' })
  @ApiResponse({ status: 400, description: 'Maximum bot limit reached' })
  addBot() {
    return this.botService.addBot();
  }

  @Delete('bots/latest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove the latest bot', tags: ['bots'] })
  @ApiResponse({ status: 200, description: 'Bot removal result' })
  removeLatestBot() {
    return { removed: this.botService.removeBot() };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get system status', tags: ['orders', 'bots'] })
  @ApiResponse({ status: 200, description: 'System status retrieved successfully' })
  getStatus() {
    return {
      orderStats: this.orderService.getOrderStats(),
      botStats: this.botService.getBotStats(),
      lists: {
        pending: this.orderService.getPendingOrders(),
        processing: this.orderService.getProcessingOrders(),
        complete: this.orderService.getCompletedOrders(),
      },
    };
  }

  @Post('maintenance/reset-stuck-orders')
  @ApiOperation({ summary: 'Reset stuck orders', tags: ['maintenance'] })
  @ApiResponse({ status: 200, description: 'Stuck orders reset successfully' })
  resetStuckOrders() {
    return { reset: this.orderService.resetStuckOrders() };
  }

  @Post('maintenance/cleanup')
  @ApiOperation({ summary: 'Cleanup orphaned timeouts', tags: ['maintenance'] })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  cleanup() {
    return this.botService.cleanupOrphanedTimeouts();
  }

  @Get('maintenance/integrity')
  @ApiOperation({ summary: 'Validate system integrity', tags: ['maintenance'] })
  @ApiResponse({ status: 200, description: 'System integrity validation result' })
  validateIntegrity() {
    return {
      order: this.orderService.validateSystemIntegrity(),
      bot: this.botService.validateSystemIntegrity(),
    };
  }
}


