import { useEffect, useReducer, useState } from "react";
import { ActivityLog } from "./components/ActivityLog";
import { BotColumn } from "./components/BotColumn";
import { ControlPanel } from "./components/ControlPanel";
import { OrderColumn } from "./components/OrderColumn";
import { TopBar } from "./components/TopBar";
import {
  controllerReducer,
  createInitialState,
} from "./domain/orderController";

const getNow = () => Date.now();

export function App() {
  const [state, dispatch] = useReducer(controllerReducer, undefined, () =>
    createInitialState(),
  );
  const [now, setNow] = useState(getNow);

  useEffect(() => {
    // 较短的刷新周期让进度条平滑更新；领域层仍以真实时间判断订单是否完成。
    const intervalId = window.setInterval(() => {
      const currentTime = getNow();
      setNow(currentTime);
      dispatch({ type: "tick", now: currentTime });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, []);

  const sendControlAction = (type: "add-bot" | "remove-bot" | "reset") => {
    const currentTime = getNow();
    setNow(currentTime);
    dispatch({ type, now: currentTime });
  };

  const addOrder = (orderType: "vip" | "normal") => {
    const currentTime = getNow();
    setNow(currentTime);
    dispatch({ type: "add-order", orderType, now: currentTime });
  };

  return (
    <main className="app-shell">
      <TopBar
        pendingCount={state.pendingOrders.length}
        botCount={state.bots.length}
        completedCount={state.completedOrders.length}
      />

      <ControlPanel
        hasBots={state.bots.length > 0}
        onAddOrder={addOrder}
        onAction={sendControlAction}
      />

      <section className="workspace" aria-label="订单流转">
        <OrderColumn
          title="等待区"
          subtitle="VIP 订单优先，普通订单保持先来先处理"
          orders={state.pendingOrders}
          emptyText="暂无等待订单"
        />
        <BotColumn bots={state.bots} now={now} />
        <OrderColumn
          title="完成区"
          subtitle="机器人处理满 10 秒后进入完成区"
          orders={state.completedOrders}
          emptyText="暂无完成订单"
        />
      </section>

      <ActivityLog entries={state.log} />
    </main>
  );
}
