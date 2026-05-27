import { OrderController } from '../domain/order-controller';
import { SystemClock, RealScheduler } from '../domain/time';
import { runCommand } from './dispatcher';
import { formatEvent, formatInit, formatSummary, REPORT_HEADER } from './format';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const clock = new SystemClock();
  const ctrl = new OrderController(clock, new RealScheduler());

  // The report (header, event log, footer) goes to stdout -> scripts/result.txt,
  // matching the employer's expected format. Step narration goes to stderr.
  console.log(REPORT_HEADER);
  console.log('');
  console.log(formatInit(clock.now(), 0));
  ctrl.subscribe((e) => console.log(formatEvent(e)));

  // Step 1: Queue the same first three orders as the employer sample. The VIP
  // (#2) jumps ahead of the normals; within the normal tier, #1 stays ahead of
  // #3 (FIFO by id).
  console.error('--- Adding orders (normal #1, vip #2, normal #3) ---');
  runCommand(ctrl, 'add-order --type normal'); // #1
  runCommand(ctrl, 'add-order --type vip'); //    #2
  runCommand(ctrl, 'add-order --type normal'); // #3

  await sleep(1_000);

  // Step 2: Add two bots. Each takes the highest-priority pending order:
  // bot #1 -> VIP #2, bot #2 -> NORMAL #1. NORMAL #3 keeps waiting.
  console.error('--- Adding bots #1 and #2 ---');
  runCommand(ctrl, 'add-bot'); // bot #1 -> VIP #2
  await sleep(1_000);
  runCommand(ctrl, 'add-bot'); // bot #2 -> NORMAL #1

  // Step 3: Let the first two orders complete and let bot #1 pick up NORMAL #3.
  // This mirrors the employer sample's first cooking cycle.
  await sleep(10_500);

  // Step 4: Add VIP #4. Bot #2 is idle now, so it immediately picks it up.
  console.error('--- Adding VIP order #4 while bot #2 is idle ---');
  runCommand(ctrl, 'add-order --type vip'); // #4, bot #2 picks it up

  // Step 5: Let NORMAL #3 and VIP #4 complete, then destroy the newest idle bot
  // (#2). This keeps the main scenario close to the employer sample.
  await sleep(10_500);
  console.error('--- del-bot (no id): destroy newest idle bot #2 ---');
  runCommand(ctrl, 'del-bot');

  // Step 6: Add one extra order to demonstrate the README's destroy-while-
  // processing case. Bot #1 picks it up; removing the newest bot now destroys a
  // PROCESSING bot, returns the order to PENDING, then bot #3 cooks it from
  // scratch.
  await sleep(1_000);
  console.error('--- Adding extra normal order #5 for processing-destroy case ---');
  runCommand(ctrl, 'add-order --type normal'); // #5, bot #1 picks it up
  await sleep(1_000);
  console.error('--- del-bot (no id): destroy newest bot #1 mid-cook (expect requeue of #5) ---');
  runCommand(ctrl, 'del-bot');
  await sleep(1_000);
  console.error('--- Adding bot #3 to finish requeued order #5 ---');
  runCommand(ctrl, 'add-bot'); // bot #3 -> NORMAL #5
  await sleep(10_500);

  console.error('--- Scenario complete ---');
  console.log('');
  console.log(formatSummary(ctrl.snapshot()));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
