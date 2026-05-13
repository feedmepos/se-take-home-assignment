import fs from 'fs';
import path from 'path';

const RESULT_FILE = path.join(process.cwd(), 'scripts', 'result.txt');

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARN' | 'SUCCESS';
  message: string;
  data?: unknown;
}

class Logger {
  private logs: LogEntry[] = [];

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private createEntry(
    level: LogEntry['level'],
    message: string,
    data?: unknown
  ): LogEntry {
    return {
      timestamp: this.formatTime(new Date()),
      level,
      message,
      data,
    };
  }

  private formatLogLine(entry: LogEntry): string {
    return `[${entry.timestamp}] ${entry.message}`;
  }

  private logToConsole(entry: LogEntry): void {
    const line = this.formatLogLine(entry);
    switch (entry.level) {
      case 'ERROR':
        console.error(line);
        break;
      case 'WARN':
        console.warn(line);
        break;
      default:
        console.log(line);
    }
  }

  info(message: string, data?: unknown): void {
    const entry = this.createEntry('INFO', message, data);
    this.logs.push(entry);
    this.logToConsole(entry);
  }

  error(message: string, data?: unknown): void {
    const entry = this.createEntry('ERROR', message, data);
    this.logs.push(entry);
    this.logToConsole(entry);
  }

  warn(message: string, data?: unknown): void {
    const entry = this.createEntry('WARN', message, data);
    this.logs.push(entry);
    this.logToConsole(entry);
  }

  success(message: string, data?: unknown): void {
    const entry = this.createEntry('SUCCESS', message, data);
    this.logs.push(entry);
    this.logToConsole(entry);
  }

  logOrderCreated(orderId: number, type: string): void {
    this.success(`Created ${type} Order #${orderId} - Status: PENDING`);
  }

  logOrderCompleted(orderId: number, processingTime?: number): void {
    const timeStr = processingTime ? ` (Processing time: ${processingTime}s)` : '';
    this.success(`Order completed #${orderId} - Status: COMPLETE${timeStr}`);
  }

  logBotCreated(botId: number): void {
    this.success(`Bot #${botId} created - Status: ACTIVE`);
  }

  logBotRemoved(botId: number, status?: string): void {
    const statusStr = status ? ` while ${status}` : '';
    this.success(`Bot #${botId} destroyed${statusStr}`);
  }

  logBotPickedUpOrder(botId: number, orderId: number, orderType: string): void {
    this.success(`Bot #${botId} picked up ${orderType} Order #${orderId} - Status: PROCESSING`);
  }

  logBotIdle(botId: number): void {
    this.success(`Bot #${botId} is now IDLE - No pending orders`);
  }

  logSystemInitialized(botCount: number): void {
    this.success(`System initialized with ${botCount} bots`);
  }

  logSystemReset(): void {
    this.info('System reset');
  }

  logRateLimitExceeded(ip: string, endpoint: string): void {
    this.warn(`Rate limit exceeded`, { ip, endpoint });
  }

  saveToFile(): void {
    try {
      const content = this.formatLogs();
      fs.writeFileSync(RESULT_FILE, content, 'utf-8');
      console.log(`\nResults saved to ${RESULT_FILE}`);
    } catch (error) {
      console.error('Failed to save results to file:', error);
    }
  }

  private formatLogs(): string {
    let content = '';
    
    // Output all logs in chronological order
    this.logs.forEach((log) => {
      content += this.formatLogLine(log) + '\n';
    });

    return content;
  }

  private groupByLevel(): Record<LogEntry['level'], LogEntry[]> {
    return {
      INFO: this.logs.filter((l) => l.level === 'INFO'),
      ERROR: this.logs.filter((l) => l.level === 'ERROR'),
      WARN: this.logs.filter((l) => l.level === 'WARN'),
      SUCCESS: this.logs.filter((l) => l.level === 'SUCCESS'),
    };
  }
}

export const logger = new Logger();
