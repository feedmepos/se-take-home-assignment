import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from '../order.controller';
import { OrderService } from '../order.service';
import { BotService } from '../../bot/bot.service';
import { OrderType } from '../order.types';

describe('OrderController', () => {
  let controller: OrderController;
  let orders: jest.Mocked<OrderService>;
  let bots: jest.Mocked<BotService>;

  beforeEach(async () => {
    orders = {
      createOrder: jest.fn(),
    } as unknown as jest.Mocked<OrderService>;

    bots = {
      onNewOrder: jest.fn(),
    } as unknown as jest.Mocked<BotService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: OrderService, useValue: orders },
        { provide: BotService, useValue: bots },
      ],
    }).compile();

    controller = module.get(OrderController);
  });

  it('should create order and trigger scheduling', () => {
    const mockOrder = { id: 1, type: OrderType.NORMAL };
    orders.createOrder.mockReturnValue(mockOrder as any);

    const result = controller.create(OrderType.NORMAL);

    expect(orders.createOrder).toHaveBeenCalledWith(OrderType.NORMAL);
    expect(bots.onNewOrder).toHaveBeenCalled();
    expect(result).toBe(mockOrder);
  });

  it('still triggers scheduling for VIP order', () => {
    orders.createOrder.mockReturnValue({ id: 2 } as any);
  
    controller.create('VIP' as any);
  
    expect(bots.onNewOrder).toHaveBeenCalled();
  });
  
});
