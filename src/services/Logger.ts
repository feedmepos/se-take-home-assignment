import fs from 'fs';
import path from 'path';

export interface FinalStats {
  totalOrders: number;
  vipOrders: number;
  normalOrders: number;
  completedOrders: number;
  activeBots: number;
  pendingOrders: number;
}

export interface ILogger {
  log(message: string): void;
  writeFinalStatus(stats: FinalStats): void;
}

const RESULT_PATH = path.join(process.cwd(), 'scripts', 'result.txt');

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

export class FileLogger implements ILogger {
  constructor() {
    fs.writeFileSync(RESULT_PATH, "McDonald's Order Management System - Simulation Results\n\n");
    this.log('System initialized with 0 bots');
  }

  log(message: string): void {
    const line = `[${timestamp()}] ${message}`;
    console.log(line);
    fs.appendFileSync(RESULT_PATH, line + '\n');
  }

  writeFinalStatus(stats: FinalStats): void {
    const block = [
      '',
      'Final Status:',
      `- Total Orders Processed: ${stats.totalOrders} (${stats.vipOrders} VIP, ${stats.normalOrders} Normal)`,
      `- Orders Completed: ${stats.completedOrders}`,
      `- Active Bots: ${stats.activeBots}`,
      `- Pending Orders: ${stats.pendingOrders}`,
      '',
    ].join('\n');
    fs.appendFileSync(RESULT_PATH, block);
  }
}

export class NoOpLogger implements ILogger {
  readonly entries: string[] = [];

  log(message: string): void {
    this.entries.push(message);
  }

  writeFinalStatus(_stats: FinalStats): void {}
}
