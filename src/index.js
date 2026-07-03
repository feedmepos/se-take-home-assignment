// Scripted, non-interactive scenario that exercises every requirement.
// After each action it prints a STATUS snapshot (pending queue, what each bot
// is cooking, and completed orders) so the whole system state is visible —
// not just the event that was triggered. Driven by a virtual clock, so it runs
// instantly while still showing realistic 10s gaps in HH:MM:SS.
import { OrderController } from './OrderController.js';
import { createVirtualClock } from './virtualClock.js';

// Anchor the clock at 09:00:00 for readable, deterministic timestamps.
const BASE_MS = 9 * 3600 * 1000;

function formatTime(ms) {
  const total = Math.floor((BASE_MS + ms) / 1000);
  const hh = String(Math.floor(total / 3600) % 24).padStart(2, '0');
  const mm = String(Math.floor(total / 60) % 60).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function main() {
  const clock = createVirtualClock();
  const lines = [
    "McDonald's Order Management System - Simulation Results",
    'Legend: V#=VIP order, N#=Normal order | STATUS shows state AFTER each step',
    '',
  ];
  const log = (msg, ms) => lines.push(`[${formatTime(ms)}] ${msg}`);

  const controller = new OrderController({
    scheduler: clock.scheduler,
    now: clock.now,
    onEvent: log,
  });

  const fmtOrder = (o) => `${o.type === 'VIP' ? 'V' : 'N'}#${o.number}`;
  const fmtBot = (b) =>
    `#${b.id} ${b.status}${b.order ? ` -> ${fmtOrder(b.order)}` : ''}`;

  // Print the current state after a step.
  function status() {
    const s = controller.snapshot();
    lines.push(`   PENDING : ${s.pending.map(fmtOrder).join(', ') || '(none)'}`);
    lines.push(`   BOTS    : ${s.bots.map(fmtBot).join(' | ') || '(none)'}`);
    lines.push(`   COMPLETE: ${s.completed.map(fmtOrder).join(', ') || '(none)'}`);
    lines.push('');
  }

  // Run a labelled step, then show the resulting state.
  function step(label, fn) {
    lines.push(`>> ${label}`);
    fn();
    status();
  }

  step('System starts with 0 bots', () => {
    log('System initialized', clock.now());
  });

  step('Customer places a Normal order', () => {
    clock.advance(1000);
    controller.newNormalOrder(); // #1001
  });

  step('VIP places an order (jumps ahead of the Normal order)', () => {
    clock.advance(1000);
    controller.newVipOrder(); // #1002
  });

  step('Another Normal order arrives', () => {
    clock.advance(1000);
    controller.newNormalOrder(); // #1003
  });

  step('Manager adds Bot #1 (immediately grabs the VIP order)', () => {
    controller.addBot();
  });

  step('Manager adds Bot #2 (grabs the next order)', () => {
    controller.addBot();
  });

  step('A new VIP order arrives while both bots are busy', () => {
    clock.advance(1000);
    controller.newVipOrder(); // #1004
  });

  step('10 seconds pass — bots finish and pick up the next orders', () => {
    clock.advance(10_000);
  });

  step('Manager removes the newest bot mid-cook (order returns to queue)', () => {
    controller.removeBot();
  });

  step('Time passes — remaining bot drains the queue', () => {
    clock.advance(20_000);
  });

  const snap = controller.snapshot();
  const vip = snap.completed.filter((o) => o.type === 'VIP').length;
  const normal = snap.completed.length - vip;
  lines.push('Final Summary:');
  lines.push(`- Orders Completed: ${snap.completed.length} (${vip} VIP, ${normal} Normal)`);
  lines.push(`- Active Bots: ${snap.bots.length}`);
  lines.push(`- Pending Orders: ${snap.pending.length}`);

  process.stdout.write(lines.join('\n') + '\n');
}

main();
