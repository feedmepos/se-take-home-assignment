'use strict';

const { OrderController } = require('./src/orderController');

/**
 * Non-interactive demonstration used by scripts/run.sh to produce result.txt.
 * Uses REAL 10s-per-order timers, so the printed HH:MM:SS timestamps reflect
 * actual order-completion times. Walks through every requirement:
 *   VIP priority, unique increasing ids, +Bot picking up work immediately,
 *   bots going IDLE, and -Bot returning an in-progress order to the queue.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const controller = new OrderController({ onLog: (line) => console.log(line) });

  console.log("McDonald's Order Controller - Scenario Run");
  console.log('(each order takes 10 seconds to cook)\n');

  // t=0: three orders queue up (VIP jumps ahead of the first normal order).
  controller.newNormalOrder(); // #1 NORMAL
  controller.newVipOrder(); //    #2 VIP
  controller.newNormalOrder(); // #3 NORMAL

  // t=0: first bot starts cooking VIP #2 immediately.
  controller.addBot(); // Bot #1 -> VIP #2

  // t=2: second bot starts cooking NORMAL #1 in parallel.
  await sleep(2000);
  controller.addBot(); // Bot #2 -> NORMAL #1

  // t=4: a late VIP order jumps ahead of the still-pending NORMAL #3.
  await sleep(2000);
  controller.newVipOrder(); // #4 VIP -> queue: VIP#4, NORMAL#3

  // t=5: manager removes the newest bot mid-cook; NORMAL #1 returns to the queue.
  await sleep(1000);
  controller.removeBot(); // destroys Bot #2 -> NORMAL #1 back to PENDING
  controller.addBot(); //    Bot #3 -> picks the highest-priority pending order

  // Let every remaining order finish cooking.
  await sleep(22000);

  console.log('\n--- FINAL STATUS ---');
  const s = controller.status();
  console.log(`Pending : ${s.pending.map((o) => `${o.type}#${o.id}`).join(', ') || '(none)'}`);
  console.log(`Complete: ${s.complete.map((o) => `${o.type}#${o.id}`).join(', ') || '(none)'}`);
  console.log(`Bots    : ${s.bots.map((b) => `#${b.id}:${b.status}`).join(', ') || '(none)'}`);
}

main();
