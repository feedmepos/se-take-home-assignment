import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoggerService } from './logger.service.js';

describe('LoggerService', () => {
  let logger: LoggerService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T14:30:45'));
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger = new LoggerService();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  it('should log with timestamp by default', () => {
    logger.log('hello');
    expect(consoleSpy).toHaveBeenCalledWith('[14:30:45] hello');
  });

  it('should log without timestamp when flag is false', () => {
    logger.log('hello', false);
    expect(consoleSpy).toHaveBeenCalledWith('hello');
  });

  it('should log with timestamp when flag is explicitly true', () => {
    logger.log('hello', true);
    expect(consoleSpy).toHaveBeenCalledWith('[14:30:45] hello');
  });
});
