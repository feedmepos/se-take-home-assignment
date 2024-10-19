import { IsEnum, IsNotEmpty } from "class-validator"

export class CreateCustomerDto {

    @IsNotEmpty()
    @IsEnum(['NORMAL' , 'VIP'], {
        message: 'Valid role required'
    })
    role: 'NORMAL' | 'VIP';
}