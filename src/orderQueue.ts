import { ErrDuplicateID } from "./errors.js";
import { log as logger } from "./log.js";

export interface Order {
  id: number;
  type: "normal" | "vip";
  status: "pending" | "completed";
}

export const newQueue = (log: typeof logger) => {
  const pending: Order[] = [];
  const completed: Order[] = [];
  let nextId = 1001;

  function logNewOrder(order: Order) {
    log(
      `Created ${order.type === "normal" ? "Normal" : "VIP"} Order #${order.id} — Status: PENDING`,
    );
  }

  return {
    addOrder(type: "normal" | "vip") {
      // Create order with unique ID
      const newOrder: Order = {
        id: nextId++,
        status: "pending",
        type,
      };

      // Ensure no duplicate IDs
      if (pending.some((o) => o.id === newOrder.id)) {
        throw new ErrDuplicateID(newOrder.id);
      }

      if (type === "normal") {
        pending.push(newOrder);
        logNewOrder(newOrder);
        return newOrder;
      }

      // VIP orders are added to the front of all normal orders but after existing VIP orders
      const vipIndex = pending.findIndex((o) => o.type === "normal");

      // No normal orders, add VIP order to the end of the queue
      if (vipIndex === -1) {
        pending.push(newOrder);
        logNewOrder(newOrder);
        return newOrder;
      }

      // Insert VIP order before the first normal order
      pending.splice(vipIndex, 0, newOrder);
      logNewOrder(newOrder);
      return newOrder;
    },
    getNextOrder() {
      return pending.shift() ?? null;
    },
    returnOrder(order: Order) {
      order.status = "pending";

      let insertIdx = pending.length;

      for (let i = 0; i < pending.length; i++) {
        const curr = pending[i];

        if (curr === undefined) {
          break;
        }

        // Same type and current item has a higher ID → insert before it
        if (curr.type === order.type && curr.id > order.id) {
          insertIdx = i;
          break;
        }
        // Returning a VIP but we've reached the normal section → insert here
        if (order.type === "vip" && curr.type === "normal") {
          insertIdx = i;
          break;
        }
      }

      pending.splice(insertIdx, 0, order);
    },
    completeOrder(order: Order) {
      order.status = "completed";
      completed.push(order);
    },
    peek() {
      return pending[0] ?? null;
    },
    pendingCounts() {
      return pending.length;
    },
    getState() {
      return {
        pending: [...pending],
        completed: [...completed],
      };
    },
  };
};
