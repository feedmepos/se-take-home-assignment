// App.tsx
import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import { Controls } from "./components/Controls";
import { OrderCard } from "./components/OrderCard";
import { BotStatusCard } from "./components/BotStatusCard";

type CustomerType = "NORMAL" | "VIP";
type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE";
type BotStatus = "IDLE" | "PROCESSING";

interface Order {
  id: number;
  customerType: CustomerType;
  status: OrderStatus;
  createdAt: number;
  startedAt?: number;
}

interface Bot {
  id: number;
  status: BotStatus;
  currentOrderId?: number;
  timeoutId?: number;
}

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [pendingQueue, setPendingQueue] = useState<number[]>([]); // queue of order IDs
  const [now, setNow] = useState<number>(Date.now());
  const [processingSeconds, setProcessingSeconds] = useState<number>(10); // default 10s
  const processingMs = processingSeconds * 1000;

  const nextOrderIdRef = useRef(1);
  const nextBotIdRef = useRef(1);

  // Refs to hold latest data for use in setTimeout callbacks / scheduler
  const ordersRef = useRef<Order[]>(orders);
  const botsRef = useRef<Bot[]>(bots);
  const pendingQueueRef = useRef<number[]>(pendingQueue);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    botsRef.current = bots;
  }, [bots]);

  useEffect(() => {
    pendingQueueRef.current = pendingQueue;
  }, [pendingQueue]);

  // Update "now" state every 250ms if any bot is processing
  useEffect(() => {
    if (bots.some((b) => b.status === "PROCESSING")) {
      const id = setInterval(() => setNow(Date.now()), 250);
      return () => clearInterval(id);
    }
  }, [bots]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      botsRef.current.forEach((b) => {
        if (b.timeoutId != null) {
          window.clearTimeout(b.timeoutId);
        }
      });
    };
  }, []);

  const getOrderById = (id: number, list?: Order[]) => {
    const arr = list ?? ordersRef.current;
    return arr.find((o) => o.id === id);
  };

  const insertIntoPendingQueue = (orderId: number, type: CustomerType) => {
    const queue = [...pendingQueueRef.current];

    if (type === "NORMAL") {
      queue.push(orderId);
    } else {
      // VIP: insert after all existing VIP orders but before NORMAL orders
      const currentOrders = ordersRef.current;
      let lastVipIndex = -1;

      queue.forEach((id, idx) => {
        const o = currentOrders.find((ord) => ord.id === id);
        if (o?.customerType === "VIP") {
          lastVipIndex = idx;
        }
      });

      const insertAt = lastVipIndex + 1;
      queue.splice(insertAt, 0, orderId);
    }

    pendingQueueRef.current = queue;
    setPendingQueue(queue);
  };

  const scheduleWork = () => {
    const botsCopy = botsRef.current.map((b) => ({ ...b }));
    const ordersCopy = [...ordersRef.current];
    const queueCopy = [...pendingQueueRef.current];

    let changed = false;

    for (const bot of botsCopy) {
      if (bot.status === "IDLE" && queueCopy.length > 0) {
        const orderId = queueCopy.shift()!;
        const orderIdx = ordersCopy.findIndex((o) => o.id === orderId);
        if (orderIdx === -1) continue;

        const updatedOrder: Order = {
          ...ordersCopy[orderIdx],
          status: "PROCESSING",
          startedAt: Date.now(),
        };
        ordersCopy[orderIdx] = updatedOrder;

        bot.status = "PROCESSING";
        bot.currentOrderId = orderId;

        const timeoutId = window.setTimeout(() => {
          completeOrder(bot.id, orderId);
        }, processingMs);
        bot.timeoutId = timeoutId;

        changed = true;
      }
    }

    if (changed) {
      botsRef.current = botsCopy;
      ordersRef.current = ordersCopy;
      pendingQueueRef.current = queueCopy;

      setBots(botsCopy);
      setOrders(ordersCopy);
      setPendingQueue(queueCopy);
    }
  };

  const completeOrder = (botId: number, orderId: number) => {
    const botsCopy = botsRef.current.map((b) => ({ ...b }));
    const ordersCopy = [...ordersRef.current];

    const bot = botsCopy.find((b) => b.id === botId);
    if (!bot) return;

    // If bot is no longer processing this order (e.g. bot removed), ignore
    if (bot.currentOrderId !== orderId) return;

    const orderIdx = ordersCopy.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) return;

    ordersCopy[orderIdx] = {
      ...ordersCopy[orderIdx],
      status: "COMPLETE",
    };

    bot.status = "IDLE";
    bot.currentOrderId = undefined;
    if (bot.timeoutId != null) {
      window.clearTimeout(bot.timeoutId);
    }
    bot.timeoutId = undefined;

    botsRef.current = botsCopy;
    ordersRef.current = ordersCopy;

    setBots(botsCopy);
    setOrders(ordersCopy);

    // Try to process another order if available
    scheduleWork();
  };

  const createOrder = (type: CustomerType) => {
    const id = nextOrderIdRef.current++;
    const newOrder: Order = {
      id,
      customerType: type,
      status: "PENDING",
      createdAt: Date.now(),
    };

    const newOrders = [...ordersRef.current, newOrder];
    ordersRef.current = newOrders;
    setOrders(newOrders);

    insertIntoPendingQueue(id, type);

    // See if any idle bot can pick this up
    scheduleWork();
  };

  const handleAddNormalOrder = () => {
    createOrder("NORMAL");
  };

  const handleAddVipOrder = () => {
    createOrder("VIP");
  };

  const handleAddBot = () => {
    const id = nextBotIdRef.current++;
    const newBot: Bot = {
      id,
      status: "IDLE",
    };

    const newBots = [...botsRef.current, newBot];
    botsRef.current = newBots;
    setBots(newBots);

    // Immediately try to process any pending order
    scheduleWork();
  };

  const handleRemoveBot = () => {
    if (botsRef.current.length === 0) return;

    const botsCopy = [...botsRef.current];
    const removedBot = botsCopy.pop()!;

    // Stop timer if any
    if (removedBot.timeoutId != null) {
      window.clearTimeout(removedBot.timeoutId);
    }

    let ordersCopy = [...ordersRef.current];
    let queueCopy = [...pendingQueueRef.current];

    if (removedBot.currentOrderId != null) {
      const orderIdx = ordersCopy.findIndex(
        (o) => o.id === removedBot.currentOrderId
      );
      if (orderIdx !== -1) {
        const currentOrder = ordersCopy[orderIdx];
        if (currentOrder.status === "PROCESSING") {
          const reverted: Order = {
            ...currentOrder,
            status: "PENDING",
            startedAt: undefined,
          };
          ordersCopy[orderIdx] = reverted;

          // Put it back into queue respecting VIP rules
          ordersRef.current = ordersCopy;
          setOrders(ordersCopy);

          pendingQueueRef.current = queueCopy;
          setPendingQueue(queueCopy);

          insertIntoPendingQueue(reverted.id, reverted.customerType);

          // refresh local copies after insert
          ordersCopy = ordersRef.current;
          queueCopy = pendingQueueRef.current;
        }
      }
    }

    botsRef.current = botsCopy;
    setBots(botsCopy);

    // Let remaining bots pick up work, if any
    scheduleWork();
  };

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const completeOrders = orders.filter((o) => o.status === "COMPLETE");

  const formatCustomerLabel = (type: CustomerType) =>
    type === "VIP" ? "VIP" : "Normal";

  const formatTime = (ts?: number) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return d.toLocaleTimeString();
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>McDonald&apos;s Cooking Bot Simulator</h1>
        <p className="subtitle">
          Simulate orders and cooking bots based on the FeedMe SE take-home
          assignment.
        </p>
      </header>

      <Controls
        onAddNormal={handleAddNormalOrder}
        onAddVip={handleAddVipOrder}
        onAddBot={handleAddBot}
        onRemoveBot={handleRemoveBot}
        botCount={bots.length}
        processingSeconds={processingSeconds}
        onChangeProcessingSeconds={setProcessingSeconds}
      />

      <section className="main-layout">
        <div className="column">
          <h2>PENDING</h2>
          <p className="hint">
            New VIP orders appear before all normal orders (but behind earlier
            VIPs).
          </p>
          <div className="card-list">
            {pendingQueue.map((orderId) => {
              const order = getOrderById(orderId);
              if (!order) return null;
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  formatCustomerLabel={formatCustomerLabel}
                  formatTime={formatTime}
                />
              );
            })}
            {pendingQueue.length === 0 && (
              <div className="empty-state">No pending orders.</div>
            )}
          </div>
        </div>

        <div className="column">
          <h2>COMPLETE</h2>
          <div className="card-list">
            {completeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                variant="complete"
                formatCustomerLabel={formatCustomerLabel}
                formatTime={formatTime}
              />
            ))}
            {completeOrders.length === 0 && (
              <div className="empty-state">No completed orders yet.</div>
            )}
          </div>
        </div>

        <div className="column">
          <h2>Bot Status</h2>
          <div className="card-list">
            {bots.map((bot) => (
              <BotStatusCard
                key={bot.id}
                bot={bot}
                getOrderById={(id) => getOrderById(id)}
                formatCustomerLabel={formatCustomerLabel}
                formatTime={formatTime}
                processingMs={processingMs}
                now={now}
              />
            ))}
            {bots.length === 0 && (
              <div className="empty-state">
                No bots yet. Click "+ Bot" to start processing.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default App;
