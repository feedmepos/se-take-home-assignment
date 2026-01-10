import type { Order, EngineEvent } from "../engine/types";
import { OrderQueue } from "../engine/orderQueue";
import { BotManager } from "../engine/botManager";
import type { Clock } from "../engine/clock";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function hhmmss(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function runDemo(clock: Clock): Promise<void> {
  const queue = new OrderQueue();

  // Centralized logger: stdout -> result.txt (via run.sh redirect)
  const writeLog = (message: string) => {
    process.stdout.write(`[${hhmmss(clock.nowMs())}] ${message}\n`);
  };

  const events: EngineEvent[] = [];
  const onEvent = (e: EngineEvent) => {
    events.push(e);
    switch (e.type) {
      case "BOT_ADDED":
        writeLog(`Bot #${e.botId} created - Status: ACTIVE`);
        break;
      case "BOT_REMOVED":
        writeLog(`Bot #${e.botId} destroyed while IDLE`);
        break;
      case "BOT_CANCELLED":
        writeLog(
          `Bot #${e.botId} destroyed while processing Order #${e.orderId} - Order returned to PENDING`
        );
        break;
      case "ORDER_PICKED":
        writeLog(
          `Bot #${e.botId} picked up ${e.privilege} Order #${e.orderId} - Status: PROCESSING`
        );
        break;
      case "ORDER_COMPLETED":
        writeLog(
          `Bot #${e.botId} completed ${e.privilege} Order #${
            e.orderId
          } - Status: COMPLETE (Processing time: ${e.processingMs / 1000}s)`
        );
        break;
      case "BOT_IDLE":
        writeLog(`Bot #${e.botId} is now IDLE - No pending orders`);
        break;
      case "ORDER_ENQUEUED":
        writeLog(
          `Created ${e.privilege === "VIP" ? "VIP" : "Normal"} Order #${
            e.orderId
          } - Status: PENDING`
        );
        break;
    }
  };

  // Use spec time by default (10 seconds). If you want faster local demo, change to 2000.
  const PROCESS_MS = 10_000;
  const bots = new BotManager(queue, clock, onEvent, PROCESS_MS);

  let nextOrderId = 1;

  const addOrder = (privilege: "Normal" | "VIP") => {
    const o: Order = {
      id: nextOrderId++,
      privilege,
      status: "PENDING",
      createdAtMs: clock.nowMs(),
    };
    queue.enqueue(o);

    // Emit “ORDER_ENQUEUED” from scenario layer (since queue is a pure data structure)
    onEvent({ type: "ORDER_ENQUEUED", orderId: o.id, privilege: o.privilege });

    // Notify bots (if any idle)
    bots.notifyNewOrder();
  };

  process.stdout.write(
    "McDonald's Order Management System - Simulation Results\n\n"
  );
  writeLog(`System initialized with ${bots.getBotsCount()} bots`);

  // ===== Scenario =====
  addOrder("Normal");
  addOrder("Normal");
  addOrder("VIP");
  addOrder("Normal");

  bots.addBot();
  await clock.sleep(2500);
  bots.addBot();

  // Wait long enough for all orders to complete with 2 bots:
  // 4 orders * 10s / 2 bots ≈ 20s, add buffer
  await clock.sleep(25_000);

  bots.removeNewestBot();

  // === Final Status (no timestamp) ===
  const completedIds = bots.getCompletedIds();
  const totalCompleted = completedIds.length;

  // 如果你要精确统计 VIP/Normal：用 events 来数最稳
  const completedVip = events.filter(
    (e) => e.type === "ORDER_COMPLETED" && e.privilege === "VIP"
  ).length;
  const completedNormal = events.filter(
    (e) => e.type === "ORDER_COMPLETED" && e.privilege === "Normal"
  ).length;

  const activeBots = bots.getBotsCount();
  const pendingOrders = queue.snapshotPendingIds().length;

  process.stdout.write("\nFinal Status:\n");
  process.stdout.write(
    `- Total Orders Processed: ${totalCompleted} (${completedVip} VIP, ${completedNormal} Normal)\n`
  );
  process.stdout.write(`- Orders Completed: ${totalCompleted}\n`);
  process.stdout.write(`- Active Bots: ${activeBots}\n`);
  process.stdout.write(`- Pending Orders: ${pendingOrders}\n`);
}
