import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { OrderService } from './order.service';
import { BotStatus } from '../domain/bots/bot.entity';
import { OrderType } from '../domain/orders/order.entity';
import { InMemoryOrderRepository } from '../infrastructure/repositories/in-memory-order.repository';
import { InMemoryBotRepository } from '../infrastructure/repositories/in-memory-bot.repository';

describe('BotService', () => {
  let service: BotService;
  let orderService: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: 'OrderRepository', useClass: InMemoryOrderRepository },
        { provide: 'BotRepository', useClass: InMemoryBotRepository },
        OrderService,
        BotService,
      ],
    }).compile();

    service = module.get<BotService>(BotService);
    orderService = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    // Clean up any remaining timeouts to prevent test leaks
    service.cleanup();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add a bot', () => {
    const bot = service.addBot();
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.id).toBe(1);
  });

  it('should increment bot IDs', () => {
    const bot1 = service.addBot();
    const bot2 = service.addBot();
    expect(bot1.id).toBe(1);
    expect(bot2.id).toBe(2);
  });

  it('should remove a bot', () => {
    service.addBot();
    service.addBot();
    const result = service.removeBot();
    expect(result).toBe(true);
    
    const bots = service.getAllBots();
    expect(bots).toHaveLength(1);
  });

  it('should not remove bot when none exist', () => {
    const result = service.removeBot();
    expect(result).toBe(false);
  });

  it('should return idle bots', () => {
    service.addBot();
    service.addBot();
    const idleBots = service.getIdleBots();
    expect(idleBots).toHaveLength(2);
  });

  it('should return correct bot stats', () => {
    service.addBot();
    service.addBot();
    const stats = service.getBotStats();
    expect(stats.total).toBe(2);
    expect(stats.idle).toBe(2);
    expect(stats.processing).toBe(0);
  });

  it('should start processing order when bot is added and order exists', () => {
    // Create an order first
    orderService.createOrder(OrderType.NORMAL);
    
    // Add a bot - it should immediately start processing
    const bot = service.addBot();
    
    // Bot should be processing
    expect(bot.status).toBe(BotStatus.PROCESSING);
    expect(bot.currentOrderId).toBe(1);
    
    // Order should be processing
    const order = orderService.getOrderById(1);
    expect(order?.status).toBe('PROCESSING');
  });

  it('should prioritize VIP orders when bot starts processing', () => {
    // Create normal order first, then VIP order
    orderService.createOrder(OrderType.NORMAL);
    orderService.createOrder(OrderType.VIP);
    
    // Add a bot - it should process VIP order first
    const bot = service.addBot();
    
    expect(bot.currentOrderId).toBe(2); // VIP order should be processed first
  });
});
