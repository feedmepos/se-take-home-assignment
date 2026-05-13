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
    let line = `[${entry.timestamp}] ${entry.message}`;
    if (entry.data) {
      line += ` - ${JSON.stringify(entry.data)}`;
    }
    return line;
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
    this.success(`Order created`, { id: orderId, type });
  }

  logOrderCompleted(orderId: number): void {
    this.success(`Order completed`, { id: orderId });
  }

  logBotCreated(botId: number): void {
    this.success(`Bot created`, { id: botId });
  }

  logBotRemoved(botId: number): void {
    this.success(`Bot removed`, { id: botId });
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
    const header = `McDonald's Order Management System - Results\n`;
    const separator = '='.repeat(60) + '\n';
    const timestamp = `Generated: ${new Date().toLocaleString()}\n`;
    const divider = '-'.repeat(60) + '\n';

    let content = header + separator + timestamp + divider;

    // Group logs by level
    const grouped = this.groupByLevel();

    if (grouped.SUCCESS.length > 0) {
      content += `\n✅ SUCCESSFUL OPERATIONS (${grouped.SUCCESS.length}):\n`;
      grouped.SUCCESS.forEach((log) => {
        content += `  ${this.formatLogLine(log)}\n`;
      });
    }

    if (grouped.INFO.length > 0) {
      content += `\n📋 INFORMATION (${grouped.INFO.length}):\n`;
      grouped.INFO.forEach((log) => {
        content += `  ${this.formatLogLine(log)}\n`;
      });
    }

    if (grouped.WARN.length > 0) {
      content += `\n⚠️  WARNINGS (${grouped.WARN.length}):\n`;
      grouped.WARN.forEach((log) => {
        content += `  ${this.formatLogLine(log)}\n`;
      });
    }

    if (grouped.ERROR.length > 0) {
      content += `\n❌ ERRORS (${grouped.ERROR.length}):\n`;
      grouped.ERROR.forEach((log) => {
        content += `  ${this.formatLogLine(log)}\n`;
      });
    }

    // Summary
    content += `\n${divider}`;
    content += `SUMMARY:\n`;
    content += `  Total Operations: ${this.logs.length}\n`;
    content += `  Successful: ${grouped.SUCCESS.length}\n`;
    content += `  Warnings: ${grouped.WARN.length}\n`;
    content += `  Errors: ${grouped.ERROR.length}\n`;
    content += `${separator}`;

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
