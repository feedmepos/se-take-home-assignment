import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { OrderService } from '../order/order.service';
import { BotService } from '../bot/bot.service';
import { Order, OrderType } from '../order/order.types';

@Injectable()
export class CliService {
  private outputLines: string[] = [];
  private readonly resultPath = path.join(process.cwd(), 'scripts', 'result.txt');

  constructor(
    private readonly orderService: OrderService,
    private readonly botService: BotService,
  ) {}

  private ts(): string {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(n => String(n).padStart(2, '0'))
      .join(':');
  }

  private log(msg: string): void {
    const line = `[${this.ts()}] ${msg}`;
    this.outputLines.push(line);
    console.log(line);
  }

  private logState(): void {
    const pending = this.orderService.getPendingQueue();
    const complete = this.orderService.getCompletedOrders();
    const bots = this.botService.getBots();

    const pStr = pending.length
      ? pending.map(o => `#${o.id}(${o.type})`).join(' → ')
      : '(empty)';
    const cStr = complete.length
      ? complete.map(o => `#${o.id}`).join(', ')
      : '(none)';
    const bStr = bots.length
      ? bots.map(b => `Bot${b.id}[${b.status}${b.currentOrder ? `:ord${b.currentOrder.id}` : ''}]`).join('  ')
      : '(none)';

    this.log(`  PENDING  : ${pStr}`);
    this.log(`  COMPLETE : ${cStr}`);
    this.log(`  BOTS     : ${bStr}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  private async waitForAllComplete(timeoutMs = 180_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hasPending = this.orderService.getPendingCount() > 0;
      const hasProcessing = this.botService.getBots().some(b => b.currentOrder !== null);
      if (!hasPending && !hasProcessing) return;
      await this.delay(200);
    }
    this.log('WARNING: timed out waiting for orders to complete');
  }

  private writeResult(): void {
    fs.writeFileSync(this.resultPath, this.outputLines.join('\n') + '\n', 'utf8');
  }

  async run(): Promise<void> {
    this.botService.setCallbacks(
      (botId: number, order: Order) => {
        this.log(`  ✓ Bot #${botId} COMPLETED Order #${order.id} [${order.type}]`);
        this.logState();
      },
      (botId: number) => {
        this.log(`  ~ Bot #${botId} is now IDLE (no pending orders)`);
      },
    );

    this.log('═══════════════════════════════════════════════════');
    this.log("  McDonald's Order Management System — Simulation");
    this.log('═══════════════════════════════════════════════════');
    this.log('');

    // ── Phase 1: Create initial orders ──────────────────────────
    this.log('[ Phase 1 ] Creating initial orders');
    this.log('');

    const o1 = this.orderService.createOrder(OrderType.NORMAL);
    this.log(`  + Normal Order #${o1.id} added to PENDING`);

    const o2 = this.orderService.createOrder(OrderType.NORMAL);
    this.log(`  + Normal Order #${o2.id} added to PENDING`);

    const o3 = this.orderService.createOrder(OrderType.NORMAL);
    this.log(`  + Normal Order #${o3.id} added to PENDING`);

    const o4 = this.orderService.createOrder(OrderType.VIP);
    this.log(`  + VIP Order #${o4.id} added → placed BEFORE all Normal orders`);

    const o5 = this.orderService.createOrder(OrderType.VIP);
    this.log(`  + VIP Order #${o5.id} added → placed after VIP #${o4.id}, before Normal orders`);

    this.logState();
    this.log('');

    // ── Phase 2: Add two bots ────────────────────────────────────
    this.log('[ Phase 2 ] Adding 2 bots (+ Bot × 2)');
    this.log('');

    const b1 = this.botService.addBot();
    this.log(`  + Bot #${b1.id} created → immediately picks first pending order`);
    this.logState();

    const b2 = this.botService.addBot();
    this.log(`  + Bot #${b2.id} created → immediately picks next pending order`);
    this.logState();
    this.log('');

    // ── Phase 3: Remove newest bot mid-processing (at T+5s) ──────
    this.log('[ Phase 3 ] Removing newest bot mid-processing (- Bot after 5 s)');
    this.log('  Waiting 5 seconds...');
    await this.delay(5000);

    const rem1 = this.botService.removeLatestBot();
    if (rem1) {
      if (rem1.currentOrder) {
        this.log(`  - Bot #${rem1.id} removed (was processing Order #${rem1.currentOrder.id})`);
        this.log(`    → Order #${rem1.currentOrder.id} returned to PENDING at correct priority`);
      } else {
        this.log(`  - Bot #${rem1.id} removed (was IDLE)`);
      }
    }
    this.logState();
    this.log('');

    // ── Phase 4: Wait for Bot #1 to complete its first order ─────
    this.log('[ Phase 4 ] Waiting for Bot #1 to finish (10 s mark from bot creation)');
    await this.delay(5000); // 5+5 = 10 s total since bots were added
    this.logState();
    this.log('');

    // ── Phase 5: New orders arrive mid-flight ────────────────────
    this.log('[ Phase 5 ] New orders arrive mid-flight');
    this.log('');

    const o6 = this.orderService.createOrder(OrderType.NORMAL);
    this.log(`  + Normal Order #${o6.id} added`);
    this.botService.notifyNewOrder();

    const o7 = this.orderService.createOrder(OrderType.VIP);
    this.log(`  + VIP Order #${o7.id} added → placed BEFORE Normal orders`);
    this.botService.notifyNewOrder();

    this.logState();
    this.log('');

    // ── Phase 6: Add another bot ─────────────────────────────────
    this.log('[ Phase 6 ] Adding Bot (+ Bot)');
    await this.delay(2000);

    const b2b = this.botService.addBot();
    this.log(`  + Bot #${b2b.id} created → picks next pending order`);
    this.logState();
    this.log('');

    // ── Phase 7: Remove newest bot again ─────────────────────────
    this.log('[ Phase 7 ] Removing newest bot again (- Bot after 3 s)');
    await this.delay(3000);

    const rem2 = this.botService.removeLatestBot();
    if (rem2) {
      if (rem2.currentOrder) {
        this.log(`  - Bot #${rem2.id} removed (was processing Order #${rem2.currentOrder.id})`);
        this.log(`    → Order #${rem2.currentOrder.id} returned to PENDING at correct priority`);
      } else {
        this.log(`  - Bot #${rem2.id} removed (was IDLE)`);
      }
    }
    this.logState();
    this.log('');

    // ── Phase 8: Scale up with multiple bots ─────────────────────
    this.log('[ Phase 8 ] Scaling up — adding 2 more bots (+ Bot × 2)');
    await this.delay(1000);

    const b3 = this.botService.addBot();
    this.log(`  + Bot #${b3.id} created`);
    const b4 = this.botService.addBot();
    this.log(`  + Bot #${b4.id} created`);
    this.logState();
    this.log('');

    // ── Phase 9: Wait for all orders to complete ─────────────────
    this.log('[ Phase 9 ] Waiting for all remaining orders to complete...');
    await this.waitForAllComplete();
    this.log('');

    // ── Final summary ─────────────────────────────────────────────
    this.log('═══════════════════════════════════════════════════');
    this.log('  SIMULATION COMPLETE');
    this.log('═══════════════════════════════════════════════════');
    this.logState();
    this.log('');
    this.log('  Order completion timestamps:');
    for (const order of this.orderService.getCompletedOrders()) {
      const t = order.completedAt!;
      const stamp = [t.getHours(), t.getMinutes(), t.getSeconds()]
        .map(n => String(n).padStart(2, '0'))
        .join(':');
      this.log(`    Order #${order.id} [${order.type}] completed at ${stamp}`);
    }
    this.log('');
    this.log('═══════════════════════════════════════════════════');

    this.writeResult();
    this.log(`Results written to result.txt`);
  }
}
