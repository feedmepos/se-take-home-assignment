import { Controller, Get, Query, Param, Body, Post, ParseIntPipe, ValidationPipe } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create_customer_dto';

@Controller('customer')
export class CustomerController {

    constructor(private readonly customerService: CustomerService) {}

    @Get()
    findAll(@Query('role') role?: 'NORMAL' | 'VIP') {
        return this.customerService.findAll(role)
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.customerService.findOne(id)
    }

    @Post("create")
    create(@Body(ValidationPipe) customerDto: CreateCustomerDto) {
        return this.customerService.create(customerDto)
    }
}
