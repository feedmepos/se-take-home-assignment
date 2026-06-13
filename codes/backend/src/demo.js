'use strict';

/**
 * Non-interactive demo used by scripts/run.sh to produce scripts/result.txt.
 *
 * It runs a fixed scenario that demonstrates every requirement and prints
 * timestamped (HH:MM:SS) log lines to stdout:
 *   1. New NORMAL + VIP orders, showing VIP jumps ahead of NORMAL in PENDING.
 *   2. Two bots processing in parallel.
 *   3. Removing the newest bot mid-process returns its order to PENDING.
 *   4. Each order takes 10 seconds (configurable via PROCESS_MS for fast runs).
 *
 * PROCESS_MS env var overrides the 10s processing time (handy for CI speed),
 * but defaults to the 10000ms required by the assignment.
 */

const { OrderController, OrderType } = require('./orderController');
const { logLine, formatState, attachLogging } = require('./logger');

const PROCESS_MS = Number(process.env.PROCESS_MS) || 10000;

const controller = new OrderController({ processMs: PROCESS_MS });
attachLogging(controller);

function status(label) {
  logLine(`STATUS ${label ? `(${label}) ` : ''}-> ${formatState(controller)}`);
}

logLine(`=== McDonald's Order Controller demo (processMs=${PROCESS_MS}) ===`);

// t0 -- create orders and bots.
controller.addNormalOrder();              // #1 NORMAL
controller.addVipOrder();                 // #2 VIP (jumps ahead of #1)
status('after 1 normal + 1 vip order');

controller.addBot();                      // bot1 -> VIP #2
controller.addBot();                      // bot2 -> NORMAL #1
status('after +2 bots');

// t = 3s -- destroy the newest bot while it is still processing #1.
setTimeout(() => {
  controller.removeBot();                 // removes bot2, returns NORMAL #1
  status('after -1 bot (order returned)');
}, Math.round(PROCESS_MS * 0.3));

// We expect orders #2 and #1 to both reach COMPLETE.
const EXPECTED_COMPLETES = 2;
controller.on('order:complete', () => {
  if (controller.complete.length >= EXPECTED_COMPLETES) {
    status('final');
    logLine('=== demo finished ===');
    // Allow the final writes to flush before exiting.
    setImmediate(() => process.exit(0));
  }
});
