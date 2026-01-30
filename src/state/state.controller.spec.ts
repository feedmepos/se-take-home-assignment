import { Test, TestingModule } from '@nestjs/testing';
import { StateController } from './state.controller';
import { OrderService } from '../order/order.service';
import { BotService } from '../bot/bot.service';

describe('StateController', () => {
  let controller: StateController;
  let orders: jest.Mocked<OrderService>;
  let bots: jest.Mocked<BotService>;

  beforeEach(async () => {
    orders = {
      getPending: jest.fn(),
      getCompleted: jest.fn(),
    } as unknown as jest.Mocked<OrderService>;

    bots = {
      getBots: jest.fn(),
    } as unknown as jest.Mocked<BotService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StateController],
      providers: [
        { provide: OrderService, useValue: orders },
        { provide: BotService, useValue: bots },
      ],
    }).compile();

    controller = module.get(StateController);
  });

  it('should return aggregated system state', () => {
    const pending = [{ id: 1 }];
    const completed = [{ id: 2 }];
    const botsState = [{ id: 1, status: 'IDLE' }];

    orders.getPending.mockReturnValue(pending as any);
    orders.getCompleted.mockReturnValue(completed as any);
    bots.getBots.mockReturnValue(botsState as any);

    const result = controller.getState();

    expect(result).toEqual({
      pending,
      completed,
      bots: botsState,
    });
  });
});
