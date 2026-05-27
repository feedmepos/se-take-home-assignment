import { IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import type { OrderType } from '../contracts';

export class CreateOrderDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['NORMAL', 'VIP'])
  type?: OrderType;
}

export class OrderTypeQuery {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['NORMAL', 'VIP'])
  type?: OrderType;
}
