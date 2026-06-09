// Simple simulation of orders + bots to validate rules (plain JS)
class Order {
  constructor(id, seq, type) {
    this.id = id;
    this.seq = seq;
    this.type = type; // 'VIP' or 'NORMAL'
    this.status = "PENDING";
  }
}

class Bot {
  constructor(id) {
    this.id = id;
    this.currentOrderId = null;
    this.timer = null;
  }
}

const PROCESS_TIME_MS = 1000; // 1s in simulation

const state = {
  orders: [],
  bots: [],
  nextId: 1,
  nextSeq: 1,
  nextBotId: 1,
};

function addOrder(type) {
  const o = new Order(state.nextId++, state.nextSeq++, type);
  state.orders.push(o);
  log(`Added ${type} order #${o.id}`);
  schedule();
  return o;
}

function addBot() {
  const b = new Bot(state.nextBotId++);
  state.bots.push(b);
  log(`Added Bot#${b.id}`);
  schedule();
  return b;
}

function removeBot() {
  const b = state.bots.pop();
  if (!b) return;
  log(`Removed Bot#${b.id}`);
  if (b.currentOrderId != null) {
    // return order to PENDING and place at its original seq position
    const order = state.orders.find((o) => o.id === b.currentOrderId);
    if (order) {
      order.status = "PENDING";
      log(`Order #${order.id} returned to PENDING`);
    }
    if (b.timer) clearTimeout(b.timer);
  }
}

function selectNextOrder() {
  const pending = state.orders.filter((o) => o.status === "PENDING");
  const vip = pending
    .filter((o) => o.type === "VIP")
    .sort((a, b) => a.seq - b.seq);
  if (vip.length) return vip[0];
  const normal = pending
    .filter((o) => o.type === "NORMAL")
    .sort((a, b) => a.seq - b.seq);
  return normal.length ? normal[0] : null;
}

function schedule() {
  state.bots.forEach((b) => {
    if (b.currentOrderId == null) {
      const next = selectNextOrder();
      if (next) {
        next.status = "PROCESSING";
        b.currentOrderId = next.id;
        log(`Bot#${b.id} picked Order#${next.id} (${next.type})`);
        b.timer = setTimeout(() => {
          // may have been removed
          const exists = state.bots.find((x) => x.id === b.id);
          if (exists && exists.currentOrderId === next.id) {
            next.status = "COMPLETE";
            exists.currentOrderId = null;
            log(`Bot#${b.id} completed Order#${next.id}`);
            schedule();
          }
        }, PROCESS_TIME_MS);
      }
    }
  });
}

function log(msg) {
  console.log(
    new Date().toLocaleTimeString(),
    msg,
    "| PENDING:",
    state.orders
      .filter((o) => o.status === "PENDING")
      .map((o) => `${o.type}#${o.id}`),
    "| PROCESSING:",
    state.orders
      .filter((o) => o.status === "PROCESSING")
      .map((o) => `#${o.id}`),
    "| COMPLETE:",
    state.orders.filter((o) => o.status === "COMPLETE").map((o) => `#${o.id}`),
  );
}

async function runScenario() {
  log("Start scenario");
  addOrder("NORMAL");
  addOrder("NORMAL");
  addOrder("VIP");
  addBot();
  await wait(1500);
  addOrder("VIP");
  addBot();
  await wait(500);
  addOrder("NORMAL");
  await wait(500);
  // remove latest bot while it might be processing
  removeBot();
  await wait(2500);
  log("Scenario finished");
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

runScenario().then(() => setTimeout(() => process.exit(0), 500));
