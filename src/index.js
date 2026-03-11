#!/usr/bin/env node
"use strict";

/**
 * FeedMe — McDonald's Order Controller CLI
 *
 * Demonstrates all requirements:
 *  1. Normal orders enter PENDING queue
 *  2. VIP orders jump ahead of Normal orders (FIFO within VIP)
 *  3. Bots process one order at a time (configurable, default 10 s)
 *  4. Adding a bot immediately starts processing pending orders
 *  5. Removing newest bot returns its in-progress order to PENDING
 *  6. Order IDs are unique and increasing
 */

const OrderController = require("./OrderController");
const Logger = require("./Logger");
const { resolve } = require("path");

// Allow test harness to inject shorter process time via env var
const PROCESS_MS = parseInt(process.env.ORDER_PROCESS_MS ?? "10000", 10);
const OUTPUT = process.env.OUTPUT_FILE ?? resolve(__dirname, "../scripts/result.txt");

// Utility: wait for N milliseconds
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Utility: print a snapshot table to the logger
function printSnapshot(logger, label, snap) {
  logger.section(label);
  const pendingIds = snap.pending.map((o) => `#${o.id}(${o.type[0]})`).join(", ") || "(empty)";
  const botLines = snap.bots
    .map((b) => `  Bot #${b.id}: ${b.status}${b.orderId ? ` → Order #${b.orderId}` : ""}`)
    .join("\n") || "  (none)";
  const completeIds = snap.complete.map((o) => `#${o.id}(${o.type[0]}) @${o.completedAt}`).join(", ") || "(empty)";

  logger.info(`PENDING  : ${pendingIds}`);
  logger.info(`BOTS     :\n${botLines}`);
  logger.info(`COMPLETE : ${completeIds}`);
}

async function run() {
  const logger = new Logger(OUTPUT);
  const ctrl = new OrderController(logger);
  ctrl.setProcessTime(PROCESS_MS);

  const TICK = PROCESS_MS; // one full processing cycle

  // ──────────────────────────────────────────────────────────────────────────
  logger.section("SCENARIO 1 — Normal orders + 1 bot");
  // ──────────────────────────────────────────────────────────────────────────

  ctrl.addOrder("NORMAL"); // Order #1
  ctrl.addOrder("NORMAL"); // Order #2
  ctrl.addOrder("NORMAL"); // Order #3
  printSnapshot(logger, "After adding 3 normal orders (no bots yet)", ctrl.snapshot());

  ctrl.addBot(); // Bot #1 → picks up #1 immediately
  printSnapshot(logger, "After adding Bot #1", ctrl.snapshot());

  await wait(TICK); // Order #1 completes, #2 picked up
  printSnapshot(logger, `After ${TICK}ms — Order #1 should be COMPLETE`, ctrl.snapshot());

  await wait(TICK); // Order #2 completes, #3 picked up
  printSnapshot(logger, `After ${TICK * 2}ms — Order #2 should be COMPLETE`, ctrl.snapshot());

  await wait(TICK); // Order #3 completes, bot idle
  printSnapshot(logger, `After ${TICK * 3}ms — All orders COMPLETE`, ctrl.snapshot());

  // ──────────────────────────────────────────────────────────────────────────
  logger.section("SCENARIO 2 — VIP priority ordering");
  // ──────────────────────────────────────────────────────────────────────────

  // Add two normals and two VIPs — VIPs should jump ahead of normals
  ctrl.addOrder("NORMAL"); // Order #4
  ctrl.addOrder("NORMAL"); // Order #5
  ctrl.addOrder("VIP");    // Order #6 → behind existing VIPs (none), ahead of normals
  ctrl.addOrder("VIP");    // Order #7 → behind #6 (VIP FIFO), ahead of normals

  printSnapshot(logger, "Queue: should be VIP#6, VIP#7, Normal#4, Normal#5", ctrl.snapshot());

  ctrl.addBot(); // Bot #2 → picks up VIP#6
  await wait(TICK);
  printSnapshot(logger, `After ${TICK}ms — VIP#6 done, Bot #2 picks up VIP#7`, ctrl.snapshot());

  await wait(TICK);
  printSnapshot(logger, `After ${TICK * 2}ms — VIP#7 done, Bot #2 picks up Normal#4`, ctrl.snapshot());

  await wait(TICK * 2);
  printSnapshot(logger, "All orders from Scenario 2 complete", ctrl.snapshot());

  // ──────────────────────────────────────────────────────────────────────────
  logger.section("SCENARIO 3 — Multiple bots, parallel processing");
  // ──────────────────────────────────────────────────────────────────────────

  ctrl.addOrder("NORMAL"); // #8
  ctrl.addOrder("VIP");    // #9
  ctrl.addOrder("NORMAL"); // #10
  ctrl.addOrder("VIP");    // #11

  ctrl.addBot(); // Bot #3 → picks up VIP#9  (highest priority)
  ctrl.addBot(); // Bot #4 → picks up VIP#11 (next VIP)
  printSnapshot(logger, "2 new bots: each picks up a VIP order in parallel", ctrl.snapshot());

  await wait(TICK);
  printSnapshot(logger, `After ${TICK}ms — VIP orders done, bots pick up Normal orders`, ctrl.snapshot());

  await wait(TICK);
  printSnapshot(logger, "All Scenario 3 orders complete", ctrl.snapshot());

  // ──────────────────────────────────────────────────────────────────────────
  logger.section("SCENARIO 4 — Remove bot mid-processing (order returns to PENDING)");
  // ──────────────────────────────────────────────────────────────────────────

  ctrl.addOrder("NORMAL"); // #12
  ctrl.addOrder("NORMAL"); // #13
  ctrl.addBot();           // Bot #5 → picks up #12
  printSnapshot(logger, "Bot #5 processing Order #12", ctrl.snapshot());

  await wait(TICK / 2); // halfway through
  ctrl.removeBot();      // Bot #5 removed — #12 returns to PENDING
  printSnapshot(logger, `After ${TICK / 2}ms — Bot #5 removed, Order #12 back in PENDING`, ctrl.snapshot());

  ctrl.addBot(); // Bot #6 → picks up #12 again
  await wait(TICK);
  printSnapshot(logger, `After ${TICK}ms — Order #12 complete by Bot #6`, ctrl.snapshot());

  await wait(TICK);
  printSnapshot(logger, "All Scenario 4 orders complete", ctrl.snapshot());

  // ──────────────────────────────────────────────────────────────────────────
  logger.section("FINAL SUMMARY");
  // ──────────────────────────────────────────────────────────────────────────
  const final = ctrl.snapshot();
  logger.info(`Total orders completed : ${final.complete.length}`);
  logger.info(`Orders still pending   : ${final.pending.length}`);
  logger.info(`Active bots            : ${final.bots.length}`);

  await logger.close();
  console.log(`\nOutput written to: ${OUTPUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
