import { OrderController } from '../domain/order-controller';
import { SystemClock, RealScheduler } from '../domain/time';
import { runCommand } from './dispatcher';
import { formatEvent } from './format';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const ctrl = new OrderController(new SystemClock(), new RealScheduler());
  ctrl.subscribe((e) => console.log(formatEvent(e)));

  // Step 1: Queue three orders (1 normal, 1 VIP, 1 normal)
  console.error('--- Adding orders ---');
  runCommand(ctrl, 'add-order --type normal');   // #1
  runCommand(ctrl, 'add-order --type vip');      // #2
  runCommand(ctrl, 'add-order --type normal');   // #3

  await sleep(200);

  // Step 2: Add two bots — they grab the top two orders by priority (#2 VIP, #1 NORMAL)
  console.error('--- Adding bots ---');
  runCommand(ctrl, 'add-bot');  // bot #1 -> VIP #2
  runCommand(ctrl, 'add-bot');  // bot #2 -> NORMAL #1

  // Step 3: After ~5s (mid-cook), remove bot #1 while it is still PROCESSING order #2
  // This triggers OrderRequeued for order #2
  await sleep(5_000);
  console.error('--- Removing bot #1 mid-cook (expect OrderRequeued) ---');
  runCommand(ctrl, 'del-bot --id 1');

  // Step 4: Add another VIP order and a new bot to pick it up
  await sleep(200);
  console.error('--- Adding VIP order #4 and new bot #3 ---');
  runCommand(ctrl, 'add-order --type vip');  // #4
  runCommand(ctrl, 'add-bot');               // bot #3 -> should pick up requeued VIP #2

  // Step 5: Wait for all cooking to complete (~22s total from here: two 10s cooks remain)
  // bot #2 finishes order #1 at ~t=10s (it started at t~0, has ~5s left)
  // bot #3 starts VIP #2 (requeued) and finishes at +10s
  // then bot #3 picks up NORMAL #3, finishes at +10s more
  // order #4 is also queued; we need enough bots or time
  await sleep(25_000);

  // Narration + final summary go to stderr so stdout (-> result.txt) stays a pure event log.
  const snap = ctrl.snapshot();
  console.error('--- Scenario complete ---');
  console.error(
    `[summary] pending=${snap.pending.length} processing=${snap.processing.length} complete=${snap.complete.length} bots=${snap.bots.length}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
