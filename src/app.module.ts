import { Module } from '@nestjs/common';
import { OrderService } from './services/order.service';
import { BotService } from './services/bot.service';
import { InMemoryOrderRepository } from './infrastructure/repositories/in-memory-order.repository';
import { InMemoryBotRepository } from './infrastructure/repositories/in-memory-bot.repository';
import { CliController } from './controllers/cli.controller';
import { HttpController } from './controllers/http.controller';

@Module({
  imports: [],
  controllers: [CliController, HttpController],
  providers: [
    // Domain bindings
    { provide: 'OrderRepository', useClass: InMemoryOrderRepository },
    { provide: 'BotRepository', useClass: InMemoryBotRepository },
    // Services
    OrderService,
    BotService,
  ],
})
export class AppModule {}
