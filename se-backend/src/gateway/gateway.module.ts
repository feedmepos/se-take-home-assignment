import { Module } from '@nestjs/common';
import { Gateway } from './gateway';

@Module({
    providers: [Gateway],
    exports: [Gateway]
})
export class GatewayModule {}
