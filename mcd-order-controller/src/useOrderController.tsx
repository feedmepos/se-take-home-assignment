import { useEffect, useRef, useState } from "react";
import type { Bot, Order, OrderType } from "./types";

export function useOrderController() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [processingOrders, setProcessingOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);

  const orderIdRef = useRef(1000);

  const createOrder = (type: OrderType) => {
    const order: Order = {
      id: orderIdRef.current++,
      type,
      status: "PENDING",
    };

    setPendingOrders((prev) => {
      if (type === "VIP") {
        const vipOrders = prev.filter((o) => o.type === "VIP");
        const normalOrders = prev.filter(
          (o) => o.type === "NORMAL"
        );

        return [...vipOrders, order, ...normalOrders];
      }

      return [...prev, order];
    });
  };

  const addBot = () => {
    let newId = 1;

    while (bots.some((bot) => bot.id === newId)) {
      newId++;
    }

    const newBot: Bot = {
      id: newId,
      processingOrder: null,
    };

    setBots((prev) => [...prev, newBot]);
  };

  const removeBot = () => {
    setBots((prevBots) => {
      if (prevBots.length === 0) return prevBots;

      const newestBot = prevBots[prevBots.length - 1];

      if (
        newestBot.timeoutId &&
        newestBot.processingOrder
      ) {
        clearTimeout(newestBot.timeoutId);

        const order = {
          ...newestBot.processingOrder,
          status: "PENDING" as const,
        };

        //remove from processing immediately
        setProcessingOrders((prev) =>
          prev.filter((o) => o.id !== order.id)
        );

        setPendingOrders((prev) => {
          const exists = prev.some(
            (o) => o.id === order.id
          );

          if (exists) return prev;

          const vipOrders = prev.filter(
            (o) => o.type === "VIP"
          );

          const normalOrders = prev.filter(
            (o) => o.type === "NORMAL"
          );

          return order.type === "VIP"
            ? [order, ...vipOrders, ...normalOrders]
            : [...vipOrders, order, ...normalOrders];
        });
      }

      return prevBots.slice(0, -1);
    });
  };

  useEffect(() => {
    const idleBot = bots.find(
      (bot) => !bot.processingOrder
    );

    if (!idleBot) return;

    if (pendingOrders.length === 0) return;

    const nextOrder = pendingOrders[0];

    const updatedOrder: Order = {
      ...nextOrder,
      status: "PROCESSING",
    };

    // REMOVE immediately from pending
    setPendingOrders((prev) =>
      prev.filter((o) => o.id !== nextOrder.id)
    );

    // ADD to processing safely
    setProcessingOrders((prev) => {
      const exists = prev.some(
        (o) => o.id === updatedOrder.id
      );

      if (exists) return prev;

      return [...prev, updatedOrder];
    });

    // START bot processing
    const timeoutId = window.setTimeout(() => {
      setProcessingOrders((prev) =>
        prev.filter((o) => o.id !== updatedOrder.id)
      );

      setCompletedOrders((prev) => {
        const exists = prev.some(
          (o) => o.id === updatedOrder.id
        );

        if (exists) return prev;

        return [
          ...prev,
          {
            ...updatedOrder,
            status: "COMPLETE",
          },
        ];
      });

      setBots((prevBots) =>
        prevBots.map((b) =>
          b.id === idleBot.id
            ? {
                ...b,
                processingOrder: null,
                timeoutId: undefined,
              }
            : b
        )
      );
    }, 10000);

    // ASSIGN order to bot
    setBots((prevBots) =>
      prevBots.map((b) =>
        b.id === idleBot.id
          ? {
              ...b,
              processingOrder: updatedOrder,
              timeoutId,
            }
          : b
      )
    );
  }, [pendingOrders, bots]);

  return {
    pendingOrders,
    processingOrders,
    completedOrders,
    bots,
    createOrder,
    addBot,
    removeBot,
  };
}