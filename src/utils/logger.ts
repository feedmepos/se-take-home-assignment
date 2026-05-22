import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private logs: string[] = [];

  constructor(private outputFile?: string) {
    // Clear the output file if it exists
    if (this.outputFile && fs.existsSync(this.outputFile)) {
      fs.unlinkSync(this.outputFile);
    }
  }

  private getTimestamp(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  log(message: string): void {
    const timestamp = this.getTimestamp();
    const logLine = `[${timestamp}] ${message}`;

    this.logs.push(logLine);
    console.log(logLine);

    if (this.outputFile) {
      fs.appendFileSync(this.outputFile, logLine + '\n');
    }
  }

  logFinalStatus(orderService: any, botService: any): void {
    const allOrders = orderService.getAllOrders();
    const vipCount = allOrders.completed.filter((o: any) => o.type === 'VIP').length;
    const normalCount = allOrders.completed.filter((o: any) => o.type === 'NORMAL').length;

    this.log('');
    this.log('Final Status:');
    this.log(`- Total Orders Processed: ${allOrders.completed.length} (${vipCount} VIP, ${normalCount} Normal)`);
    this.log(`- Orders Completed: ${allOrders.completed.length}`);
    this.log(`- Active Bots: ${botService.getBotCount()}`);
    this.log(`- Pending Orders: ${orderService.getPendingOrderCount()}`);
  }

  getLogs(): string[] {
    return [...this.logs];
  }
}
