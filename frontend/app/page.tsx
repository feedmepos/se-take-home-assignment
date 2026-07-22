"use client";

import { BotStatusPanel } from "./components/BotStatusPanel";
import { ControlPanel } from "./components/ControlPanel";
import { OrderBoards } from "./components/OrderBoards";
import { StatsBar } from "./components/StatsBar";
import { useOrderController } from "./hooks/useOrderController";

export default function Home() {
  const { pendingOrders, completeOrders, bots, addOrder, addBot, removeBot } = useOrderController();
  const processingCount = bots.filter((b) => b.status === "processing").length;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-text">
              <h1>MCD Order Controller</h1>
              <p>Automated Cooking Bot System</p>
            </div>
          </div>
          <StatsBar
            pending={pendingOrders.length}
            processing={processingCount}
            complete={completeOrders.length}
            bots={bots.length}
          />
        </div>
      </header>

      <ControlPanel onAddOrder={addOrder} onAddBot={addBot} onRemoveBot={removeBot} />
      <BotStatusPanel bots={bots} />
      <OrderBoards pendingOrders={pendingOrders} completeOrders={completeOrders} />

      <footer className="footer">
        <p>Created By Nite Cheng</p>
      </footer>
    </div>
  );
}
