import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService {
  private readonly resultPath: string;

  constructor() {
    this.resultPath = path.resolve(process.cwd(), 'scripts/result.txt');
    // Reset file at start of each run
    fs.writeFileSync(this.resultPath, '', { encoding: 'utf8' });
  }

  log(message: string): void {
    const now = new Date();
    const timestamp = LoggerService.formatTime(now);
    const line = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.resultPath, line, { encoding: 'utf8' });
    // Also print to stdout for convenience
    // eslint-disable-next-line no-console
    console.log(line.trimEnd());
  }

  private static formatTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds(),
    )}`;
  }
}

