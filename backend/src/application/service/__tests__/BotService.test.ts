import { describe, it, expect, vi } from 'vitest';
import { BotService } from '../BotService';
import { OrderProcessingEngine } from '../../../domain/service/OrderProcessingEngine';
import { Bot } from '../../../domain/model/Bot';

describe('BotService', () => {
  it('should add bot and return JSON', () => {
    const engine = new OrderProcessingEngine();
    const service = new BotService(engine);

    const result = service.addBot();

    expect(result.id).toBe(1);
    expect(result.name).toBe('Bot-1');
    expect(result.status).toBe('IDLE');
  });

  it('should remove bot', () => {
    const engine = new OrderProcessingEngine();
    const service = new BotService(engine);

    service.addBot();
    service.addBot();
    expect(service.getBots().length).toBe(2);

    service.removeBot();
    expect(service.getBots().length).toBe(1);
  });

  it('should delegate to engine', () => {
    const mockEngine = {
      addBot: vi.fn().mockReturnValue(new Bot(1)),
      removeBot: vi.fn(),
      getBots: vi.fn().mockReturnValue([]),
    } as unknown as OrderProcessingEngine;

    const service = new BotService(mockEngine);
    service.addBot();
    service.removeBot();

    expect(mockEngine.addBot).toHaveBeenCalled();
    expect(mockEngine.removeBot).toHaveBeenCalled();
  });
});
