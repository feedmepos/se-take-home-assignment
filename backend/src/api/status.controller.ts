import { Controller, Get } from '@nestjs/common';
import { OrderController } from '../domain/order-controller';
import { serializeSnapshot } from './serialize';
import type { StatusDTO } from '../contracts';

@Controller()
export class StatusController {
  constructor(private readonly domain: OrderController) {}

  @Get('status')
  getStatus(): StatusDTO {
    return serializeSnapshot(this.domain.snapshot());
  }

  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
