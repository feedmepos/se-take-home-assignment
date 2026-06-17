"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [state, setState] = useState<any>({
    instanceId: "",
    pending: [],
    completed: [],
    bots: [],
  }); 

  const refresh = async () => {
    const res = await fetch("/api/state");
    const data = await res.json();
    setState(data);
    console.log(
      "Instance:",
      data.instanceId,
      "Pending:",
      data.pending.length,
      "Completed:",
      data.completed.length
    );
  };

  const callApi = async (url: string, method = "POST") => {
    await fetch(url, { method });
    refresh();
  };

  useEffect(() => {
    refresh();

    const timer = setInterval(refresh, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          🍔 McDonald's Order Dashboard
        </h1>
        <p className={styles.subtitle}>
          Automated Order Processing System
        </p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pending Orders</div>
          <div className={styles.statValue}>
            {state.pending.length}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Completed Orders</div>
          <div className={styles.statValue}>
            {state.completed.length}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Bots</div>
          <div className={styles.statValue}>
            {state.bots.length}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Busy Bots</div>
          <div className={styles.statValue}>
            {state.bots.filter((b: any) => b.busy).length}
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <button
          className={`${styles.button} ${styles.normalBtn}`}
          onClick={() =>
            callApi("/api/orders/normal")
          }
        >
          New Normal Order
        </button>

        <button
          className={`${styles.button} ${styles.vipBtn}`}
          onClick={() =>
            callApi("/api/orders/vip")
          }
        >
          New VIP Order
        </button>

        <button
          className={`${styles.button} ${styles.addBtn}`}
          onClick={() =>
            callApi("/api/bots/add")
          }
        >
          + Bot
        </button>

        <button
          className={`${styles.button} ${styles.removeBtn}`}
          onClick={() =>
            callApi("/api/bots/remove", "DELETE")
          }
        >
          - Bot
        </button>
        <button
          className={`${styles.button} `}
          onClick={() =>
            callApi("/api/reset/")
          }
        >
          Reset Dashboard
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Pending Orders
          </h2>

          {state.pending.length === 0 ? (
            <div className={styles.empty}>
              No pending orders
            </div>
          ) : (
            state.pending.map((order: any) => (
              <div
                key={order.id}
                className={styles.order}
              >
                <div className={styles.orderInfo}>
                  Order #{order.id}
                </div>

                <span
                  className={`${styles.badge} ${
                    order.type === "VIP"
                      ? styles.vip
                      : styles.normal
                  }`}
                >
                  {order.type}
                </span>
              </div>
            ))
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Cooking Bots
          </h2>

          {state.bots.length === 0 ? (
            <div className={styles.empty}>
              No bots available
            </div>
          ) : (
            state.bots.map((bot: any) => (
              <div
                key={bot.id}
                className={styles.botCard}
              >
                <div className={styles.botHeader}>
                  <strong>
                    Bot #{bot.id}
                  </strong>

                  <span
                    className={
                      bot.busy
                        ? styles.botStatusBusy
                        : styles.botStatusIdle
                    }
                  >
                    {bot.busy
                      ? "PROCESSING"
                      : "IDLE"}
                  </span>
                </div>

                {bot.busy && (
                  <div className={styles.cooking}>
                    Cooking Order #{bot.currentOrder?.id}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Completed Orders
          </h2>

          {state.completed.length === 0 ? (
            <div className={styles.empty}>
              No completed orders
            </div>
          ) : (
            state.completed.map((order: any) => (
              <div
                key={order.id}
                className={styles.order}
              >
                <div className={styles.orderInfo}>
                  Order #{order.id}
                </div>

                <span
                  className={`${styles.badge} ${styles.complete}`}
                >
                  COMPLETE
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}