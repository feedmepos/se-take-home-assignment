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

  // Step 1: Queue three orders. The VIP (#2) jumps ahead of the normals;
  // within the normal tier, #1 stays ahead of #3 (FIFO by id).
  console.error('--- Adding orders (normal #1, vip #2, normal #3) ---');
  runCommand(ctrl, 'add-order --type normal'); // #1
  runCommand(ctrl, 'add-order --type vip'); //    #2
  runCommand(ctrl, 'add-order --type normal'); // #3

  await sleep(200);

  // Step 2: Add two bots. Each takes the highest-priority pending order:
  // bot #1 -> VIP #2, bot #2 -> NORMAL #1. NORMAL #3 keeps waiting.
  console.error('--- Adding bots #1 and #2 ---');
  runCommand(ctrl, 'add-bot'); // bot #1 -> VIP #2
  runCommand(ctrl, 'add-bot'); // bot #2 -> NORMAL #1

  // Step 3: After ~5s (mid-cook), `del-bot` with NO id destroys the NEWEST bot
  // (#2), which is processing NORMAL #1 (README "- Bot" requirement). Its order
  // returns to PENDING and is restored to its original slot, ahead of NORMAL #3.
  await sleep(5_000);
  console.error('--- del-bot (no id): destroy newest bot #2 mid-cook (expect requeue of #1) ---');
  runCommand(ctrl, 'del-bot');

  // Step 4: Add a fresh bot. It resumes the requeued NORMAL #1 BEFORE NORMAL #3,
  // proving the requeue landed in its original priority slot (not the back).
  await sleep(200);
  console.error('--- Adding bot #3 (expect it to resume requeued NORMAL #1, before #3) ---');
  runCommand(ctrl, 'add-bot'); // bot #3 -> NORMAL #1

  // Step 5: Let every order finish cooking, then drain to IDLE.
  //   bot #1: VIP #2 done ~t=10s, then NORMAL #3 done ~t=20s
  //   bot #3: NORMAL #1 done ~t=15s, then idle
  await sleep(16_000);

  console.error('--- Scenario complete ---');
  console.log('');
  console.log(formatSummary(ctrl.snapshot()));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
