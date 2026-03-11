"use strict";

/**
 * Unit tests for OrderController
 * Uses Node's built-in assert module — no external test runner needed.
 * Run with: node src/tests.js
 */

const assert = require("assert");
const OrderController = require("./OrderController");

// ── Test logger stub ──────────────────────────────────────────────────────────
const makeLogger = () => ({
  lines: [],
  info(msg)  { this.lines.push(msg); },
  warn(msg)  { this.lines.push(msg); },
  error(msg) { this.lines.push(msg); },
  timestamp() { return "00:00:00"; },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FAST = 100; // ms — fast process time for tests

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}`);
    console.error(`      ${err.message}`);
    failed++;
  }
}

function makeCtrl() {
  const ctrl = new OrderController(makeLogger());
  ctrl.setProcessTime(FAST);
  return ctrl;
}

// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {

console.log("\n📋 OrderController Unit Tests\n");

// ── Order placement ────────────────────────────────────────────────────────────
console.log("Order placement");

await test("Normal orders get unique, incrementing IDs", () => {
  const ctrl = makeCtrl();
  const a = ctrl.addOrder("NORMAL");
  const b = ctrl.addOrder("NORMAL");
  assert.ok(b.id > a.id, "Second order ID should be greater");
});

await test("Normal order appears in PENDING", () => {
  const ctrl = makeCtrl();
  ctrl.addOrder("NORMAL");
  const { pending } = ctrl.snapshot();
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].type, "NORMAL");
});

await test("VIP order appears in PENDING", () => {
  const ctrl = makeCtrl();
  ctrl.addOrder("VIP");
  const { pending } = ctrl.snapshot();
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].type, "VIP");
});

// ── VIP priority ───────────────────────────────────────────────────────────────
console.log("\nVIP priority");

await test("VIP order jumps ahead of normal orders", () => {
  const ctrl = makeCtrl();
  const n1 = ctrl.addOrder("NORMAL");
  const n2 = ctrl.addOrder("NORMAL");
  const v1 = ctrl.addOrder("VIP");
  const { pending } = ctrl.snapshot();
  assert.strictEqual(pending[0].id, v1.id, "VIP should be first");
  assert.strictEqual(pending[1].id, n1.id);
  assert.strictEqual(pending[2].id, n2.id);
});

await test("VIP orders maintain FIFO order among themselves", () => {
  const ctrl = makeCtrl();
  ctrl.addOrder("NORMAL");
  const v1 = ctrl.addOrder("VIP");
  const v2 = ctrl.addOrder("VIP");
  const v3 = ctrl.addOrder("VIP");
  const { pending } = ctrl.snapshot();
  assert.strictEqual(pending[0].id, v1.id);
  assert.strictEqual(pending[1].id, v2.id);
  assert.strictEqual(pending[2].id, v3.id);
});

await test("Mixed queue: VIPs first then Normals (FIFO within each)", () => {
  const ctrl = makeCtrl();
  const n1 = ctrl.addOrder("NORMAL");
  const n2 = ctrl.addOrder("NORMAL");
  const v1 = ctrl.addOrder("VIP");
  const v2 = ctrl.addOrder("VIP");
  const { pending } = ctrl.snapshot();
  const ids = pending.map((o) => o.id);
  assert.deepStrictEqual(ids, [v1.id, v2.id, n1.id, n2.id]);
});

// ── Bot processing ─────────────────────────────────────────────────────────────
console.log("\nBot processing");

await test("Bot picks up order immediately when added", () => {
  const ctrl = makeCtrl();
  ctrl.addOrder("NORMAL");
  ctrl.addBot();
  const { pending, bots } = ctrl.snapshot();
  assert.strictEqual(pending.length, 0, "Pending should be empty");
  assert.strictEqual(bots[0].status, "WORKING");
});

await test("Bot completes order and moves it to COMPLETE", async () => {
  const ctrl = makeCtrl();
  ctrl.addOrder("NORMAL");
  ctrl.addBot();
  await wait(FAST + 20);
  const { complete, bots } = ctrl.snapshot();
  assert.strictEqual(complete.length, 1);
  assert.strictEqual(bots[0].status, "IDLE");
});

await test("Bot automatically picks up next order after completing one", async () => {
  const ctrl = makeCtrl();
  ctrl.addOrder("NORMAL");
  ctrl.addOrder("NORMAL");
  ctrl.addBot();
  await wait(FAST + 20); // first order done
  const snap1 = ctrl.snapshot();
  assert.strictEqual(snap1.complete.length, 1);
  assert.strictEqual(snap1.bots[0].status, "WORKING"); // already on second
  await wait(FAST + 20);
  const snap2 = ctrl.snapshot();
  assert.strictEqual(snap2.complete.length, 2);
  assert.strictEqual(snap2.bots[0].status, "IDLE");
});

await test("Idle bot picks up new order when it arrives", async () => {
  const ctrl = makeCtrl();
  ctrl.addBot(); // idle bot, no orders yet
  assert.strictEqual(ctrl.snapshot().bots[0].status, "IDLE");
  ctrl.addOrder("NORMAL");
  assert.strictEqual(ctrl.snapshot().bots[0].status, "WORKING");
});

await test("Multiple bots process orders in parallel", async () => {
  const ctrl = makeCtrl();
  ctrl.addOrder("NORMAL");
  ctrl.addOrder("NORMAL");
  ctrl.addBot();
  ctrl.addBot();
  const snap = ctrl.snapshot();
  // Both bots should be working immediately
  assert.strictEqual(snap.bots.filter(b => b.status === "WORKING").length, 2);
  assert.strictEqual(snap.pending.length, 0);
  await wait(FAST + 20);
  assert.strictEqual(ctrl.snapshot().complete.length, 2);
});

// ── Remove bot ─────────────────────────────────────────────────────────────────
console.log("\nBot removal");

await test("Removing idle bot reduces bot count", () => {
  const ctrl = makeCtrl();
  ctrl.addBot();
  ctrl.addBot();
  ctrl.removeBot();
  assert.strictEqual(ctrl.snapshot().bots.length, 1);
});

await test("Removing bot that is processing returns order to PENDING", async () => {
  const ctrl = makeCtrl();
  ctrl.addOrder("NORMAL");
  ctrl.addBot();
  await wait(FAST / 2); // mid-process
  ctrl.removeBot();
  const { pending, bots } = ctrl.snapshot();
  assert.strictEqual(bots.length, 0);
  assert.strictEqual(pending.length, 1, "Order should be back in PENDING");
});

await test("Newest bot is always removed first", () => {
  const ctrl = makeCtrl();
  const b1 = ctrl.addBot();
  const b2 = ctrl.addBot();
  const b3 = ctrl.addBot();
  ctrl.removeBot();
  const ids = ctrl.snapshot().bots.map(b => b.id);
  assert.ok(!ids.includes(b3), "Bot #3 (newest) should be removed");
  assert.ok(ids.includes(b1));
  assert.ok(ids.includes(b2));
});

await test("removeBot on empty pool does nothing", () => {
  const ctrl = makeCtrl();
  ctrl.removeBot(); // should not throw
  assert.strictEqual(ctrl.snapshot().bots.length, 0);
});

// ── Edge cases ─────────────────────────────────────────────────────────────────
console.log("\nEdge cases");

await test("Order IDs are globally unique across multiple orders", () => {
  const ctrl = makeCtrl();
  const ids = Array.from({ length: 10 }, () => ctrl.addOrder("NORMAL").id);
  const unique = new Set(ids);
  assert.strictEqual(unique.size, ids.length);
});

await test("Complete list is in completion order (oldest first)", async () => {
  const ctrl = makeCtrl();
  ctrl.addOrder("NORMAL");
  ctrl.addOrder("NORMAL");
  ctrl.addBot();
  await wait(FAST + 20);
  await wait(FAST + 20);
  const { complete } = ctrl.snapshot();
  assert.ok(complete[0].id < complete[1].id);
});

// ── Results ────────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Some tests failed.");
  process.exit(1);
} else {
  console.log("All tests passed ✅");
}

} // end runTests

runTests().catch((err) => { console.error(err); process.exit(1); });
