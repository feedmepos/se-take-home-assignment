import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderType } from '../domain/orders/order.entity';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Type of order to create',
    enum: OrderType,
    example: OrderType.NORMAL,
  })
  @IsEnum(OrderType, {
    message: 'type must be either NORMAL or VIP',
  })
  @IsNotEmpty({
    message: 'type is required',
  })
  type: OrderType;
}
