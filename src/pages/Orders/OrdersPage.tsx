import React, { useEffect, useRef } from "react";
// @ts-ignore: CSS module types omitted for rapid prototype
import styles from "./Orders.module.css";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import useAppSelector from "../../hooks/useAppSelector";
import {
  addNormal,
  addVIP,
  addBot,
  removeBot,
  assignOrderToBot,
  completeOrder,
  setOrderPending,
} from "../../store/slices/orders.slice";

// simple product catalog
const PRODUCTS = [
  { id: 1, name: "经典麦辣鸡腿堡", price: 18 },
  { id: 2, name: "麦香鱼", price: 16 },
  { id: 3, name: "薯条(中)", price: 9 },
];

const PROCESS_TIME_MS = 10000; // 10s per order

const OrdersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const orders = useAppSelector((s) => s.orders.orders);
  const bots = useAppSelector((s) => s.orders.bots);
  // map botId -> timeout id
  const timers = useRef<Record<number, number | null>>({});

  // helper to select next pending order (VIP first, then NORMAL) by seq
  const selectNextOrder = () => {
    const pending = orders.filter((o: any) => o.status === "PENDING");
    const vip = pending
      .filter((o: any) => o.type === "VIP")
      .sort((a: any, b: any) => a.seq - b.seq);
    if (vip.length) return vip[0];
    const normal = pending
      .filter((o: any) => o.type === "NORMAL")
      .sort((a: any, b: any) => a.seq - b.seq);
    return normal.length ? normal[0] : null;
  };

  // effect: for each bot idle, assign next order if available
  useEffect(() => {
    bots.forEach((bot: any) => {
      if (bot.currentOrderId == null) {
        const next = selectNextOrder();
        if (next) {
          dispatch(assignOrderToBot({ botId: bot.id, orderId: next.id }));
          // start timer
          const tid = window.setTimeout(() => {
            // verify bot still exists and processing same order
            const latestBot = (window as any).__STORE__
              .getState()
              .orders.bots.find((b: any) => b.id === bot.id);
            if (latestBot && latestBot.currentOrderId === next.id) {
              dispatch(completeOrder({ botId: bot.id, orderId: next.id }));
            }
            // clear timer record
            timers.current[bot.id] = null;
          }, PROCESS_TIME_MS) as unknown as number;
          timers.current[bot.id] = tid;
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bots, orders, dispatch]);

  // expose store globally for timer verification (small prototype convenience)
  useEffect(() => {
    (window as any).__STORE__ = (window as any).__STORE__ || {};
    (window as any).__STORE__.getState = () => {
      // simple snapshot via selector
      return { orders: { orders, bots } } as any;
    };
  }, [orders, bots]);

  const handleNewNormal = () => dispatch(addNormal() as any);
  const handleNewVIP = () => dispatch(addVIP() as any);

  const handleAddBot = () => dispatch(addBot() as any);

  const handleRemoveBot = () => {
    // determine last bot id to clear timer
    const lastBot = bots[bots.length - 1];
    if (lastBot) {
      // clear timer
      const t = timers.current[lastBot.id];
      if (t) {
        clearTimeout(t);
        timers.current[lastBot.id] = null;
      }
    }
    dispatch(removeBot() as any);
  };

  const pendingOrders = orders
    .filter((o: any) => o.status === "PENDING")
    .sort((a: any, b: any) => {
      if (a.type === b.type) return a.seq - b.seq;
      // VIP before NORMAL
      if (a.type === "VIP") return -1;
      return 1;
    });
  const processingOrders = orders.filter((o: any) => o.status === "PROCESSING");
  const completeOrders = orders.filter((o: any) => o.status === "COMPLETE");

  // cart total simple
  const cartTotal = 0;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button className={styles.addBtn} onClick={handleNewNormal}>
            新正常订单
          </button>
          <button className={styles.addBtn} onClick={handleNewVIP}>
            新VIP订单
          </button>
          <button className={styles.addBtn} onClick={handleAddBot}>
            + Bot
          </button>
          <button className={styles.addBtn} onClick={handleRemoveBot}>
            - Bot
          </button>
        </div>

        <div className={styles.orderPanel}>
          <div className={styles.panelTitle}>PENDING</div>
          <div className={styles.ordersRow}>
            {pendingOrders.map((o: any) => (
              <div key={o.id} className={styles.orderItem}>
                {o.type}#{o.id}
              </div>
            ))}
          </div>

          <div className={styles.panelTitle} style={{ marginTop: 10 }}>
            PROCESSING
          </div>
          <div className={styles.ordersRow}>
            {processingOrders.map((o: any) => (
              <div key={o.id} className={styles.orderItem}>
                {o.type}#{o.id}
              </div>
            ))}
          </div>

          <div className={styles.panelTitle} style={{ marginTop: 10 }}>
            COMPLETE
          </div>
          <div className={styles.ordersRow}>
            {completeOrders.map((o: any) => (
              <div key={o.id} className={styles.orderItem}>
                {o.type}#{o.id}
              </div>
            ))}
          </div>

          <div className={styles.panelTitle} style={{ marginTop: 12 }}>
            Bots
          </div>
          <div className={styles.botsRow}>
            {bots.map((b: any) => (
              <div key={b.id} className={styles.bot}>
                Bot#{b.id}{" "}
                {b.currentOrderId ? `→ ${b.currentOrderId}` : "(idle)"}
              </div>
            ))}
          </div>
        </div>

        {/* product list removed for simplified UI */}
      </div>
      {/* simplified UI: removed cart/checkout section */}
    </div>
  );
};

export default OrdersPage;
