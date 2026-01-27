import React, { useEffect, useState } from 'react';

enum OrderType {
  VIP = 'VIP',
  NORMAL = 'NORMAL',
}

enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
}

enum BotStatus {
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
}

interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
  processingAt?: Date;
  completedAt?: Date;
}

interface Bot {
  id: number;
  status: BotStatus;
  currentOrder?: Order;
  timeoutId?: number;
}

const PROCESSING_TIME_MS = 10_000;

type OrderCardProps = {
  order: Order;
  showProcessing: boolean;
  variant: 'vip' | 'normal' | 'complete';
};

const OrderCard: React.FC<OrderCardProps> = ({ order, showProcessing, variant }) => (
  <li className={`order ${variant}`}>
    <div>
      <b>Order</b> #{order.id}
      {variant === 'complete' && <> ({order.type})</>}
    </div>
    <div>
      <b>Status:</b> {order.status}
    </div>
    <div>
      <b>Created at:</b> {order.createdAt.toLocaleTimeString()}
    </div>
    <div>
      <b>Processing at:</b>{' '}
      {showProcessing && order.processingAt
        ? order.processingAt.toLocaleTimeString()
        : '-'}
    </div>
    <div>
      <b>Completed at:</b>{' '}
      {variant === 'complete' && order.completedAt
        ? order.completedAt.toLocaleTimeString()
        : '-'}
    </div>
  </li>
);

type BotCardProps = {
  bot: Bot;
};

const BotCard: React.FC<BotCardProps> = ({ bot }) => (
  <li className="bot">
    <strong>Bot #{bot.id}</strong>
    <span>
      <b>Status:</b> {bot.status}
    </span>
    {bot.currentOrder && (
      <span>
        <b>Processing order:</b> #{bot.currentOrder.id} ({bot.currentOrder.type})
        <br />
        <b>Processing at:</b>
        {bot.currentOrder.processingAt
          ? ` ${bot.currentOrder.processingAt.toLocaleTimeString()}`
          : ''}
      </span>
    )}
  </li>
);

export const App: React.FC = () => {
  const [nextOrderId, setNextOrderId] = useState(1);
  const [nextBotId, setNextBotId] = useState(1);

  const [pendingVip, setPendingVip] = useState<Order[]>([]);
  const [pendingNormal, setPendingNormal] = useState<Order[]>([]);
  const [completed, setCompleted] = useState<Order[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      bots.forEach((bot) => bot.timeoutId && clearTimeout(bot.timeoutId));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createOrder = (type: OrderType) => {
    setNextOrderId((currentId) => {
      const order: Order = {
        id: currentId,
        type,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      };

      if (type === OrderType.VIP) {
        setPendingVip((prev) => [...prev, order]);
      } else {
        setPendingNormal((prev) => [...prev, order]);
      }

      return currentId + 1;
    });
  };

  const scheduleCompletion = (botId: number, order: Order) => {
    const timeoutId = window.setTimeout(() => {
      setCompleted((prev) => [
        ...prev.filter((o) => o.id !== order.id),
        { ...order, status: OrderStatus.COMPLETE, completedAt: new Date() },
      ]);

      setBots((prevBots) =>
        prevBots.map((b) =>
          b.id === botId
            ? {
                ...b,
                status: BotStatus.IDLE,
                currentOrder: undefined,
                timeoutId: undefined,
              }
            : b,
        ),
      );
    }, PROCESSING_TIME_MS);

    setBots((prevBots) =>
      prevBots.map((b) =>
        b.id === botId ? { ...b, timeoutId } : b,
      ),
    );
  };

  const assignWorkToIdleBots = () => {
    setBots((prevBots) => {
      let vipQueue = [...pendingVip];
      let normalQueue = [...pendingNormal];

      const updatedBots = prevBots.map((bot) => {
        if (bot.currentOrder || bot.status !== BotStatus.IDLE) {
          return bot;
        }

        let nextOrder: Order | undefined;
        if (vipQueue.length > 0) {
          const [next, ...rest] = vipQueue;
          nextOrder = next;
          vipQueue = rest;
        } else if (normalQueue.length > 0) {
          const [next, ...rest] = normalQueue;
          nextOrder = next;
          normalQueue = rest;
        }

        if (!nextOrder) {
          const idleBot: Bot = {
            ...bot,
            status: BotStatus.IDLE,
            currentOrder: undefined,
          };
          return idleBot;
        }

        const processingOrder: Order = {
          ...nextOrder,
          status: OrderStatus.PROCESSING,
          processingAt: new Date(),
        };
        // Schedule completion for this bot & order
        scheduleCompletion(bot.id, processingOrder);
        const busyBot: Bot = {
          ...bot,
          status: BotStatus.PROCESSING,
          currentOrder: processingOrder,
        };
        return busyBot;
      });

      setPendingVip(vipQueue);
      setPendingNormal(normalQueue);

      return updatedBots;
    });
  };

  const addBot = () => {
    const botId = nextBotId;
    setBots((prev) => [
      ...prev,
      {
        id: botId,
        status: BotStatus.INITIALIZING,
      },
    ]);
    setNextBotId((id) => id + 1);

    // Simulate lifecycle: INITIALIZING -> READY -> IDLE
    setTimeout(() => {
      setBots((prev) =>
        prev.map((b) =>
          b.id === botId && b.status === BotStatus.INITIALIZING
            ? { ...b, status: BotStatus.READY }
            : b,
        ),
      );

      setTimeout(() => {
        setBots((prev) =>
          prev.map((b) =>
            b.id === botId && b.status === BotStatus.READY
              ? { ...b, status: BotStatus.IDLE }
              : b,
          ),
        );
      }, 500);
    }, 500);
  };

  const removeBot = () => {
    setBots((prevBots) => {
      if (prevBots.length === 0) return prevBots;

      const botsCopy = [...prevBots];
      const removed = botsCopy.pop()!;

      if (removed.timeoutId) {
        clearTimeout(removed.timeoutId);
      }

      if (removed.currentOrder) {
        const order = removed.currentOrder;
        const pendingOrder: Order = { ...order, status: OrderStatus.PENDING };
        if (pendingOrder.type === OrderType.VIP) {
          setPendingVip((prev) => [
            ...prev.filter((o) => o.id !== pendingOrder.id),
            pendingOrder,
          ]);
        } else {
          setPendingNormal((prev) => [
            ...prev.filter((o) => o.id !== pendingOrder.id),
            pendingOrder,
          ]);
        }
      }

      return botsCopy;
    });
  };

  // When there are pending orders and idle bots, assign work
  useEffect(() => {
    if (!pendingVip.length && !pendingNormal.length) return;
    if (!bots.some((b) => b.status === BotStatus.IDLE && !b.currentOrder)) return;
    assignWorkToIdleBots();
  }, [pendingVip, pendingNormal, bots]);

  return (
    <div className="app">
      <h1>McDonald Order Controller</h1>
      <p className="subtitle">
        Normal &amp; VIP orders, cooking bots, and order flow simulation (frontend only)
      </p>

      <div className="controls">
        <button onClick={() => createOrder(OrderType.NORMAL)}>New Normal Order</button>
        <button onClick={() => createOrder(OrderType.VIP)}>New VIP Order</button>
        <button onClick={addBot}>+ Bot</button>
        <button onClick={removeBot} disabled={bots.length === 0}>
          - Bot
        </button>
      </div>

      <div className="layout">
        <section className="panel">
          <h2>Pending</h2>
          <h3>VIP</h3>
          {pendingVip.length === 0 && <p className="empty">No VIP orders</p>}
          <ul>
            {pendingVip.map((o, index) => (
              <OrderCard
                key={`vip-${o.id}-${index}`}
                order={o}
                showProcessing={false}
                variant="vip"
              />
            ))}
          </ul>

          <h3>Normal</h3>
          {pendingNormal.length === 0 && <p className="empty">No normal orders</p>}
          <ul>
            {pendingNormal.map((o, index) => (
              <OrderCard
                key={`normal-${o.id}-${index}`}
                order={o}
                showProcessing={false}
                variant="normal"
              />
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Complete</h2>
          {completed.length === 0 && <p className="empty">No completed orders yet</p>}
          <ul>
            {completed.map((o, index) => (
              <OrderCard
                key={`complete-${o.id}-${index}`}
                order={o}
                showProcessing
                variant="complete"
              />
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Bots</h2>
          {bots.length === 0 && <p className="empty">No bots created</p>}
          <ul>
            {bots.map((b, index) => (
              <BotCard key={`bot-${b.id}-${index}`} bot={b} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

