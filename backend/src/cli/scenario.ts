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
  // (#1002) jumps ahead of the normals; within the normal tier, #1001 stays
  // ahead of #1003 (FIFO by id).
  console.error('--- Adding orders (normal #1001, vip #1002, normal #1003) ---');
  runCommand(ctrl, 'add-order --type normal'); // #1001
  runCommand(ctrl, 'add-order --type vip'); //    #1002
  runCommand(ctrl, 'add-order --type normal'); // #1003

  await sleep(1_000);

  // Step 2: Add two bots. Each takes the highest-priority pending order:
  // bot #1 -> VIP #1002, bot #2 -> NORMAL #1001. NORMAL #1003 keeps waiting.
  console.error('--- Adding bots #1 and #2 ---');
  runCommand(ctrl, 'add-bot'); // bot #1 -> VIP #1002
  await sleep(1_000);
  runCommand(ctrl, 'add-bot'); // bot #2 -> NORMAL #1001

  // Step 3: Let the first two orders complete and let bot #1 pick up NORMAL #1003.
  // This mirrors the employer sample's first cooking cycle.
  await sleep(10_500);

  // Step 4: Add VIP #1004. Bot #2 is idle now, so it immediately picks it up.
  console.error('--- Adding VIP order #1004 while bot #2 is idle ---');
  runCommand(ctrl, 'add-order --type vip'); // #1004, bot #2 picks it up

  // Step 5: Let NORMAL #1003 and VIP #1004 complete, then destroy the newest idle bot
  // (#2). This keeps the main scenario close to the employer sample.
  await sleep(10_500);
  console.error('--- del-bot (no id): destroy newest idle bot #2 ---');
  runCommand(ctrl, 'del-bot');

  // Step 6: Add one extra order to demonstrate the README's destroy-while-
  // processing case. Bot #1 picks it up; removing the newest bot now destroys a
  // PROCESSING bot, returns the order to PENDING, then bot #3 cooks it from
  // scratch.
  await sleep(1_000);
  console.error('--- Adding extra normal order #1005 for processing-destroy case ---');
  runCommand(ctrl, 'add-order --type normal'); // #1005, bot #1 picks it up
  await sleep(1_000);
  console.error(
    '--- del-bot (no id): destroy newest bot #1 mid-cook (expect requeue of #1005) ---',
  );
  runCommand(ctrl, 'del-bot');
  await sleep(1_000);
  console.error('--- Adding bot #3 to finish requeued order #1005 ---');
  runCommand(ctrl, 'add-bot'); // bot #3 -> NORMAL #1005
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
