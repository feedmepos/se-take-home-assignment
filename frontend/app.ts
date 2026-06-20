import type { BotSnapshot, OrderSnapshot } from "../src/domain.js";
import { OrderController } from "../src/orderController.js";

const processingSeconds = 10;
let controller = createController();
let timer: number | null = null;

const elements = {
  clock: requiredElement<HTMLElement>("#clock"),
  pendingCount: requiredElement<HTMLElement>("#pending-count"),
  processingCount: requiredElement<HTMLElement>("#processing-count"),
  completeCount: requiredElement<HTMLElement>("#complete-count"),
  botCount: requiredElement<HTMLElement>("#bot-count"),
  pendingList: requiredElement<HTMLElement>("#pending-list"),
  botList: requiredElement<HTMLElement>("#bot-list"),
  completeList: requiredElement<HTMLElement>("#complete-list"),
  eventList: requiredElement<HTMLOListElement>("#event-list"),
  toggleRun: requiredElement<HTMLButtonElement>("#toggle-run"),
};

requiredElement<HTMLButtonElement>("#new-normal").addEventListener("click", () => {
  controller.addNormalOrder();
  render();
});

requiredElement<HTMLButtonElement>("#new-vip").addEventListener("click", () => {
  controller.addVipOrder();
  render();
});

requiredElement<HTMLButtonElement>("#add-bot").addEventListener("click", () => {
  controller.addBot();
  render();
});

requiredElement<HTMLButtonElement>("#remove-bot").addEventListener("click", () => {
  controller.removeBot();
  render();
});

requiredElement<HTMLButtonElement>("#tick-one").addEventListener("click", () => {
  controller.advanceTime(1);
  render();
});

requiredElement<HTMLButtonElement>("#tick-ten").addEventListener("click", () => {
  controller.advanceTime(10);
  render();
});

requiredElement<HTMLButtonElement>("#reset").addEventListener("click", () => {
  stopTimer();
  controller = createController();
  render();
});

elements.toggleRun.addEventListener("click", () => {
  if (timer) {
    stopTimer();
    render();
    return;
  }

  elements.toggleRun.textContent = "Pause";
  timer = window.setInterval(() => {
    controller.advanceTime(1);
    render();
  }, 1000);
});

render();

function createController(): OrderController {
  return new OrderController({
    startTime: "09:00:00",
    firstOrderId: 1001,
    processingSeconds,
  });
}

function stopTimer(): void {
  if (!timer) {
    return;
  }

  window.clearInterval(timer);
  timer = null;
  elements.toggleRun.textContent = "Run";
}

function render(): void {
  const snapshot = controller.getSnapshot();

  elements.clock.textContent = snapshot.time;
  elements.pendingCount.textContent = String(snapshot.pendingOrders.length);
  elements.processingCount.textContent = String(snapshot.processingOrders.length);
  elements.completeCount.textContent = String(snapshot.completedOrders.length);
  elements.botCount.textContent = String(snapshot.bots.length);

  renderOrderList(elements.pendingList, snapshot.pendingOrders, "pending");
  renderBotList(snapshot.bots);
  renderOrderList(elements.completeList, snapshot.completedOrders, "complete");
  renderEvents(controller.formatEvents().slice(-12));
}

function renderOrderList(
  container: HTMLElement,
  orders: OrderSnapshot[],
  mode: "pending" | "complete"
): void {
  container.replaceChildren();

  if (orders.length === 0) {
    container.appendChild(emptyState());
    return;
  }

  for (const order of orders) {
    container.appendChild(orderCard(order, mode));
  }
}

function renderBotList(bots: BotSnapshot[]): void {
  elements.botList.replaceChildren();

  if (bots.length === 0) {
    elements.botList.appendChild(emptyState());
    return;
  }

  for (const bot of bots) {
    const card = document.createElement("article");
    card.className = "bot-card";

    const head = document.createElement("div");
    head.className = "item-head";

    const title = document.createElement("span");
    title.className = "item-title";
    title.textContent = `Bot #${bot.id}`;

    const badge = document.createElement("span");
    badge.className = `badge ${bot.status === "IDLE" ? "idle" : ""}`;
    badge.textContent = bot.status;

    head.append(title, badge);
    card.appendChild(head);

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = bot.orderId ? `Order #${bot.orderId}` : "No order assigned";

    if (bot.orderId && bot.orderType) {
      const orderMeta = document.createElement("div");
      orderMeta.className = "order-meta-row";
      orderMeta.append(orderTypeBadge(bot.orderType), meta);
      card.appendChild(orderMeta);
    } else {
      card.appendChild(meta);
    }

    const progress = document.createElement("div");
    progress.className = "progress";

    const bar = document.createElement("span");
    const completedPercent =
      bot.status === "PROCESSING"
        ? ((processingSeconds - bot.remainingSeconds) / processingSeconds) * 100
        : 0;
    bar.style.setProperty("--progress", `${Math.max(0, completedPercent)}%`);

    progress.appendChild(bar);
    card.appendChild(progress);

    elements.botList.appendChild(card);
  }
}

function orderCard(order: OrderSnapshot, mode: "pending" | "complete"): HTMLElement {
  const card = document.createElement("article");
  card.className = `order ${order.type === "VIP" ? "vip" : ""} ${
    mode === "complete" ? "complete" : ""
  }`;

  const head = document.createElement("div");
  head.className = "item-head";

  const title = document.createElement("span");
  title.className = "item-title";
  title.textContent = `Order #${order.id}`;

  const badge = orderTypeBadge(order.type);

  head.append(title, badge);
  card.appendChild(head);

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent =
    mode === "complete" ? `Completed at ${order.completedAt}` : `Created at ${order.createdAt}`;
  card.appendChild(meta);

  return card;
}

function orderTypeBadge(type: OrderSnapshot["type"]): HTMLElement {
  const badge = document.createElement("span");
  badge.className = `badge type-badge ${type === "VIP" ? "vip" : "normal"}`;
  badge.textContent = type;
  return badge;
}

function renderEvents(events: string[]): void {
  elements.eventList.replaceChildren();

  for (const event of events) {
    const item = document.createElement("li");
    item.textContent = event;
    elements.eventList.appendChild(item);
  }
}

function emptyState(): HTMLElement {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = "None";
  return empty;
}

function requiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}
