import { ApiProperty } from '@nestjs/swagger';
import { OrderType } from '../order.types';

export class CreateOrderDto {
  @ApiProperty({ enum: OrderType, example: OrderType.NORMAL, description: 'Order priority type' })
  type: string;
}
