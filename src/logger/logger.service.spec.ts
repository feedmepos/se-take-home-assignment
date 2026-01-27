import * as fs from 'fs';
import { LoggerService } from './logger.service';

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

describe('LoggerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize result file on construction', () => {
    const writeSpy = fs.writeFileSync as jest.Mock;

    // eslint-disable-next-line no-new
    new LoggerService();

    expect(writeSpy).toHaveBeenCalledWith(
      expect.any(String),
      '',
      expect.objectContaining({ encoding: 'utf8' }),
    );
  });

  it('should write timestamped messages to result file and console', () => {
    const appendSpy = fs.appendFileSync as jest.Mock;

    // Construct service to set up path, but we only care about log behavior
    const service = new LoggerService();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

    service.log('Test message');

    expect(appendSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/^\[\d{2}:\d{2}:\d{2}\] Test message\n$/),
      expect.objectContaining({ encoding: 'utf8' }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[\d{2}:\d{2}:\d{2}\] Test message$/),
    );

    consoleSpy.mockRestore();
  });
});
