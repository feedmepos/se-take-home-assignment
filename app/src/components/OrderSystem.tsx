import React, { useState, useEffect, useRef } from "react";
import "../styles/OrderSystem.css";

interface Order {
  id: number;
  type: "NORMAL" | "VIP";
  status: "PENDING" | "PROCESSING" | "COMPLETE";
  processingBy?: number; // Bot ID that is processing this order
  createdAt: Date; // Timestamp when order was created
  processingStartTime?: Date; // Timestamp when processing started
  completedAt?: Date; // Timestamp when order was completed
  completedBy?: number; // Bot ID that completed this order
  timerId?: number; // Bot ID that completed this order
}

interface Bot {
  id: number;
  status: "IDLE" | "PROCESSING";
  processingOrderId?: number;
  completedOrders: number; // Count of orders completed by this bot
}

const OrderSystem: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [nextBotId, setNextBotId] = useState(1);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Create a new order (normal or VIP)
  const createOrder = (type: "NORMAL" | "VIP") => {
    const newOrder: Order = {
      id: nextOrderId,
      type,
      status: "PENDING",
      createdAt: new Date(),
    };

    setNextOrderId(nextOrderId + 1);

    if (type === "VIP") {
      // Clear any existing timers to prevent memory leaks
      if (timer) {
        clearTimeout(timer);
      }
      const lastVipIndex = [...orders]
        .reverse()
        .findIndex(
          (order) => order.type === "VIP" && order.status === "PENDING"
        );

      const botsProcessingNormalOrders = bots.filter((bot) => {
        if (bot.status === "PROCESSING" && bot.processingOrderId) {
          const processingOrder = orders.find(
            (order) => order.id === bot.processingOrderId
          );
          return processingOrder && processingOrder.type === "NORMAL";
        }
        return false;
      });

      if (botsProcessingNormalOrders.length > 0) {
        const botToReassign = botsProcessingNormalOrders[0];
        const normalOrderId = botToReassign.processingOrderId!;

        const normalOrder = orders.find((order) => order.id === normalOrderId);
        if (!normalOrder) return; // Safety check

        // Pause the normal order by setting it back to PENDING
        // but keep track of its processing time so far
        const updatedOrdersWithPendingNormal = orders.map((order) => {
          if (order.id === normalOrderId) {
            return {
              ...order,
              status: "PENDING",
              processingBy: undefined,
              // Store the time already spent processing
              timerId: order.processingStartTime
                ? Math.floor(
                    (new Date().getTime() -
                      order.processingStartTime.getTime()) /
                      1000
                  )
                : 0,
            };
          }
          return order;
        });

        // Reassign bot to VIP order
        setBots((currentBots) =>
          currentBots.map((b) => {
            if (b.id === botToReassign.id) {
              return {
                ...b,
                status: "PROCESSING",
                processingOrderId: newOrder.id,
              };
            }
            return b;
          })
        );

        // Mark VIP order as processing
        newOrder.status = "PROCESSING";
        newOrder.processingBy = botToReassign.id;
        newOrder.processingStartTime = new Date();

        // Insert VIP order in the correct position
        let finalOrders;
        if (lastVipIndex === -1) {
          finalOrders = [newOrder, ...updatedOrdersWithPendingNormal];
        } else {
          const insertIndex =
            updatedOrdersWithPendingNormal.length - lastVipIndex;
          finalOrders = [...updatedOrdersWithPendingNormal];
          finalOrders.splice(insertIndex, 0, newOrder);
        }

        setOrders(finalOrders as Order[]);

        // === VIP order timeout ===
        const timerId = setTimeout(() => {
          setOrders((currentOrders: Order[]): Order[] => {
            // Mark VIP order as complete
            const updatedOrders = currentOrders.map((o) =>
              o.id === newOrder.id
                ? {
                    ...o,
                    status: "COMPLETE",
                    processingBy: undefined,
                    completedAt: new Date(),
                    completedBy: botToReassign.id,
                  }
                : o
            );

            // Check if the interrupted normal order is still pending
            const interruptedNormalOrder = updatedOrders.find(
              (o) => o.id === normalOrderId && o.status === "PENDING"
            );

            // If the interrupted normal order exists, resume processing it
            if (interruptedNormalOrder) {
              return updatedOrders.map(
                (o): Order =>
                  o.id === normalOrderId
                    ? {
                        ...o,
                        status: "PROCESSING" as const,
                        processingBy: botToReassign.id,
                        processingStartTime: new Date(),
                        // Reset the timerId as we're now tracking it with a new timer
                        timerId: undefined,
                      }
                    : (o as Order)
              );
            }

            return updatedOrders as Order[];
          });

          setBots((currentBots) => {
            return currentBots.map((b) => {
              if (b.id === botToReassign.id) {
                const updatedBot = {
                  ...b,
                  completedOrders: b.completedOrders + 1,
                };

                // Check if the interrupted normal order is still pending
                const pendingNormalOrder = orders.find(
                  (o) => o.id === normalOrderId && o.status === "PENDING"
                );

                // If the normal order exists, resume processing it
                if (pendingNormalOrder) {
                  return {
                    ...updatedBot,
                    status: "PROCESSING" as const,
                    processingOrderId: normalOrderId,
                  };
                } else {
                  // Otherwise, set the bot to IDLE
                  return {
                    ...updatedBot,
                    status: "IDLE" as const,
                    processingOrderId: undefined,
                  };
                }
              }
              return b;
            });
          });

          // If we resume a normal order, start a new timer for it
          // The timer duration should be adjusted based on how much time was already spent
          const pendingNormalOrder = orders.find(
            (o) => o.id === normalOrderId && o.status === "PENDING"
          );
          if (pendingNormalOrder && pendingNormalOrder.timerId !== undefined) {
            // Calculate remaining time (10 seconds minus time already spent)
            const timeAlreadySpent = pendingNormalOrder.timerId as number;
            const remainingTime = Math.max(
              10000 - timeAlreadySpent * 1000,
              1000
            ); // At least 1 second

            // Start a new timer for the remaining time
            const normalOrderTimeoutId = setTimeout(() => {
              setOrders((currentOrders) => {
                return currentOrders.map((o) =>
                  o.id === normalOrderId
                    ? {
                        ...o,
                        status: "COMPLETE" as const,
                        processingBy: undefined,
                        completedAt: new Date(),
                        completedBy: botToReassign.id,
                      }
                    : o
                );
              });

              setBots((currentBots) => {
                return currentBots.map((b) => {
                  if (
                    b.id === botToReassign.id &&
                    b.processingOrderId === normalOrderId
                  ) {
                    return {
                      ...b,
                      status: "IDLE" as const,
                      processingOrderId: undefined,
                      completedOrders: b.completedOrders + 1,
                    };
                  }
                  return b;
                });
              });
            }, remainingTime);

            // Store the new timer ID
            setTimer(normalOrderTimeoutId);
          }
        }, 10000);

        // Store the VIP order timer ID
        // setTimer(timerId);
      } else {
        if (lastVipIndex === -1) {
          setOrders([newOrder, ...orders]);
        } else {
          const insertIndex = orders.length - lastVipIndex;
          const updatedOrders = [...orders];
          updatedOrders.splice(insertIndex, 0, newOrder);
          setOrders(updatedOrders);
        }
      }
    } else {
      // Normal order - just add at end
      setOrders([...orders, newOrder]);
    }
  };

  // Add a new bot
  const addBot = () => {
    const newBot: Bot = {
      id: nextBotId,
      status: "IDLE",
      completedOrders: 0,
    };
    setBots([...bots, newBot]);
    setNextBotId(nextBotId + 1);
  };

  // Remove the newest bot
  const removeBot = () => {
    if (bots.length === 0) return;

    const lastBot = bots[bots.length - 1];
    const updatedBots = bots.slice(0, -1);
    setBots(updatedBots);

    // If the bot was processing an order, return it to pending
    if (lastBot.status === "PROCESSING" && lastBot.processingOrderId) {
      setOrders(
        orders.map((order) => {
          if (order.id === lastBot.processingOrderId) {
            return { ...order, status: "PENDING", processingBy: undefined };
          }
          return order;
        })
      );
    }
  };

  // Update processing time display every second
  useEffect(() => {
    const timer = setInterval(() => {
      // Force re-render to update processing time display
      if (orders.some((order) => order.status === "PROCESSING")) {
        setOrders([...orders]);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [orders]);

  // Process orders with available bots
  useEffect(() => {
    reOrderList();
  }, [bots, orders]);

  const reOrderList = () => {
    console.log("reOrderList");
    // 0) grab just the idle bots
    const idleBots = bots.filter((b) => b.status === "IDLE");
    if (idleBots.length === 0) return;

    // 1) Partition pending orders into VIP vs normal
    const vipQueue: Order[] = [];
    const normalQueue: Order[] = [];
    for (const o of orders) {
      if (o.status !== "PENDING") continue;
      (o.type === "VIP" ? vipQueue : normalQueue).push(o);
    }
    console.log("asdasdas", orders);
    // 2) Sort each by ascending ID
    vipQueue.sort((a, b) => a.id - b.id);
    normalQueue.sort((a, b) => a.id - b.id);
    console.log(vipQueue);
    console.log(normalQueue);
    // 3) Assign each idle bot—VIP first, then normal
    idleBots.forEach((bot) => {
      const order = vipQueue.shift() || normalQueue.shift();
      if (order) {
        assignAndProcess(bot, order);
      }
    });
  };

  const assignAndProcess = (bot: Bot, order: Order) => {
    // 1) mark bot as PROCESSING
    setBots((curr) =>
      curr.map((b) =>
        b.id === bot.id
          ? { ...b, status: "PROCESSING", processingOrderId: order.id }
          : b
      )
    );

    // 2) mark order as PROCESSING
    setOrders((curr) =>
      curr.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: "PROCESSING",
              processingBy: bot.id,
              processingStartTime: new Date(),
            }
          : o
      )
    );

    // 3) after 10s, complete the order and free the bot
    // If this order was previously interrupted, adjust the timer
    const processingTime = order.timerId
      ? Math.max(10000 - (order.timerId as number) * 1000, 1000) // Use remaining time if it was interrupted
      : 10000; // Default 10 seconds for new orders

    const timerId = setTimeout(() => {
      // complete the order
      setOrders((curr) =>
        curr.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "COMPLETE",
                processingBy: undefined,
                completedAt: new Date(),
                completedBy: bot.id,
                timerId: undefined, // Clear the timer ID
              }
            : o
        )
      );

      // set bot back to IDLE & bump its completed-count
      setBots((curr) =>
        curr.map((b) =>
          b.id === bot.id
            ? {
                ...b,
                status: "IDLE",
                processingOrderId: undefined,
                completedOrders: b.completedOrders + 1,
              }
            : b
        )
      );
    }, processingTime);

    // Store the timer ID
    if (timer) {
      clearTimeout(timer);
    }
    setTimer(timerId);
  };
  // Filter orders by status
  const pendingOrders = orders.filter(
    (order) => order.status === "PENDING" || order.status === "PROCESSING"
  );
  const completedOrders = orders.filter((order) => order.status === "COMPLETE");

  // Calculate processing time for orders in progress
  const getProcessingTime = (order: Order) => {
    if (order.status === "PROCESSING" && order.processingStartTime) {
      const now = new Date();
      return Math.floor(
        (now.getTime() - order.processingStartTime.getTime()) / 1000
      );
    }
    return 0;
  };

  // Calculate total processing time for completed orders
  const getTotalProcessingTime = (order: Order) => {
    if (
      order.status === "COMPLETE" &&
      order.processingStartTime &&
      order.completedAt
    ) {
      return Math.floor(
        (order.completedAt.getTime() - order.processingStartTime.getTime()) /
          1000
      );
    }
    return 0;
  };

  return (
    <div className="order-system">
      <div className="controls">
        <button onClick={() => createOrder("NORMAL")} className="btn normal">
          New Normal Order
        </button>
        <button onClick={() => createOrder("VIP")} className="btn vip">
          New VIP Order
        </button>
        <button onClick={addBot} className="btn add">
          + Bot
        </button>
        <button onClick={removeBot} className="btn remove">
          - Bot
        </button>
      </div>

      <div className="dashboard">
        <div className="order-area">
          <h2>PENDING ORDERS</h2>
          <div className="orders-container">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className={`order ${order.type.toLowerCase()} ${order.status.toLowerCase()}`}
                data-testid={`order-${order.id}`}>
                <div className="order-id">#{order.id}</div>
                <div className="order-type">{order.type}</div>
                <div className="order-status">{order.status}</div>
                <div className="order-created">
                  Created: {order.createdAt.toLocaleTimeString()}
                </div>
                {order.processingBy && (
                  <>
                    <div className="processing-by">
                      Bot #{order.processingBy}
                    </div>
                    <div className="processing-time">
                      Processing: {getProcessingTime(order)}s
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="order-area">
          <h2>COMPLETED ORDERS ({completedOrders.length})</h2>
          <div className="orders-container">
            {completedOrders.map((order) => (
              <div
                key={order.id}
                className={`order ${order.type.toLowerCase()} complete`}
                data-testid={`order-${order.id}`}>
                <div className="order-id">#{order.id}</div>
                <div className="order-type">{order.type}</div>
                <div className="order-status">COMPLETE</div>
                <div className="order-created">
                  Created: {order.createdAt.toLocaleTimeString()}
                </div>
                {order.completedAt && (
                  <div className="order-completed">
                    Completed: {order.completedAt.toLocaleTimeString()}
                  </div>
                )}
                {order.completedBy && (
                  <div className="completed-by">
                    Completed by Bot #{order.completedBy}
                  </div>
                )}
                {order.processingStartTime && order.completedAt && (
                  <div className="processing-duration">
                    Duration: {getTotalProcessingTime(order)}s
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bots-container">
        <h2>BOTS ({bots.length})</h2>
        <div className="bots">
          {bots.map((bot) => (
            <div key={bot.id} className={`bot ${bot.status.toLowerCase()}`}>
              <div className="bot-id">Bot #{bot.id}</div>
              <div className="bot-status">{bot.status}</div>
              <div className="completed-count">
                Completed: {bot.completedOrders}
              </div>
              {bot.processingOrderId && (
                <div className="processing-order">
                  Order #{bot.processingOrderId}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderSystem;
