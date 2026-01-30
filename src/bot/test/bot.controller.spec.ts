import { Test, TestingModule } from '@nestjs/testing';
import { BotController } from '../bot.controller';
import { BotService } from '../bot.service';

describe('BotController', () => {
  let controller: BotController;
  let bots: jest.Mocked<BotService>;

  beforeEach(async () => {
    bots = {
      addBot: jest.fn(),
      removeBot: jest.fn(),
      onNewOrder: jest.fn(),
      getBots: jest.fn(),
    } as unknown as jest.Mocked<BotService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotController],
      providers: [{ provide: BotService, useValue: bots }],
    }).compile();

    controller = module.get(BotController);
  });

  it('should add bot and trigger scheduling', () => {
    const result = controller.addBot();

    expect(bots.addBot).toHaveBeenCalled();
    expect(bots.onNewOrder).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it('should remove bot', () => {
    const result = controller.removeBot();

    expect(bots.removeBot).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it('should return bots', () => {
    const mockBots = [{ id: 1, status: 'IDLE' }];
    bots.getBots.mockReturnValue(mockBots as any);

    const result = controller.getBots();

    expect(result).toBe(mockBots);
  });
});
