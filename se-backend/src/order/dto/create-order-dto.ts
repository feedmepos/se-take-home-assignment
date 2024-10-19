import { IsNotEmpty, IsNumber } from "class-validator"

export class CreateOrderDto {

    @IsNumber()
    @IsNotEmpty()
    customerId: number
}