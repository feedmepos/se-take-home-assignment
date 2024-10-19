import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, ValidationPipe } from '@nestjs/common';
import { OrderService } from 'src/order/order.service';
import { CreateOrderDto } from 'src/order/dto/create-order-dto';

@Controller('order')
export class OrderController {

    
    constructor(private readonly orderService: OrderService) {}
    
    @Get()
    findAll(@Query('status') status?: 'PENDING' | 'PROCESSING' | 'COMPLETED') {
        return this.orderService.findAll(status)
    }

    @Get('pending')
    getFirstPendingOrder() {
        return this.orderService.getFirstPendingOrder();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.orderService.findOne(id)
    }

    @Post("create")
    create(@Body(ValidationPipe) orderrDto: CreateOrderDto) {
        return this.orderService.create(orderrDto)
    }

    @Get('customer/:customer')
    findByCustomerId(@Param('customer', ParseIntPipe) id: number) {
        return this.orderService.findByCustomerId(id)
    }

    @Post('update-status')
    updateStatus(@Body(ValidationPipe) body: { id: number }) {
        return this.orderService.updateStatus(body.id)
    }

    @Delete(':id')
    async remove(@Param('id') id: number) {
        return this.orderService.remove(id)
    }
}
