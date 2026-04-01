import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CliService } from './cli.service.js';
import { BotManagerService } from '../manager/bot-manager.service.js';
import { LoggerService } from '../logger/logger.service.js';

describe('CliService', () => {
  let cli: CliService;
  let manager: BotManagerService;
  let logger: LoggerService;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new BotManagerService();
    logger = new LoggerService();
    logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
    cli = new CliService(manager, logger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleCommand', () => {
    it('should add a normal order when command is "addOrder"', () => {
      cli.handleCommand('addOrder');
      expect(manager.getPendingOrders()).toHaveLength(1);
      expect(manager.getPendingOrders()[0].type).toBe('normal');
    });

    it('should add a vip order when command is "addOrderVIP"', () => {
      cli.handleCommand('addOrderVIP');
      expect(manager.getPendingOrders()).toHaveLength(1);
      expect(manager.getPendingOrders()[0].type).toBe('vip');
    });

    it('should add a bot when command is "addBot"', () => {
      cli.handleCommand('addBot');
      expect(manager.getBots()).toHaveLength(1);
    });

    it('should remove a bot when command is "removeBot"', () => {
      manager.addBot();
      cli.handleCommand('removeBot');
      expect(manager.getBots()).toHaveLength(0);
    });

    it('should log warning when removing bot with no bots', () => {
      cli.handleCommand('removeBot');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No bots'));
    });

    it('should log unknown command for invalid input', () => {
      cli.handleCommand('invalid');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
    });

    it('should be case-insensitive', () => {
      cli.handleCommand('ADDORDER');
      expect(manager.getPendingOrders()).toHaveLength(1);
    });

    it('should trim whitespace from commands', () => {
      cli.handleCommand('  addOrder  ');
      expect(manager.getPendingOrders()).toHaveLength(1);
    });

    it('should print status when command is "status"', () => {
      manager.addNormalOrder();
      logSpy.mockClear();
      cli.handleCommand('status');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PENDING'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('COMPLETE'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('BOTS'));
    });

    it('should print help menu when command is "help"', () => {
      cli.handleCommand('help');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("McDonald's Bot Manager"),
        false,
      );
    });
  });
});
