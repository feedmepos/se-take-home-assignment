import React, { useEffect, useState } from 'react';
import { Order, OrderType } from './types/order';
import { Bot } from './types/bot';
import { OrderCard } from './components/orders/OrderCard';
import { BotCard } from './components/bots/BotCard';

const API_URL = import.meta.env.VITE_API_URL as string;

interface StateResponse {
  pending: Order[];
  completed: Order[];
  bots: Bot[];
}

export const App: React.FC = () => {
  const [pending, setPending] = useState<Order[]>([]);
  const [completed, setCompleted] = useState<Order[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  /* =======================
     Fetch state (polling)
  ======================= */

  const fetchState = async () => {
    try {
      const res = await fetch(`${API_URL}/state`);
      if (!res.ok) return;

      const data: StateResponse = await res.json();
      setPending(data.pending);
      setCompleted(data.completed);
      setBots(data.bots);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch state', err);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  useEffect(() => {
    const id = setInterval(fetchState, 3000);
    return () => clearInterval(id);
  }, []);

  /* =======================
     Actions
  ======================= */

  const createOrder = async (type: OrderType) => {
    await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });

    fetchState();
  };

  const addBot = async () => {
    await fetch(`${API_URL}/bots`, { method: 'POST' });
    fetchState();
  };

  const removeBot = async () => {
    await fetch(`${API_URL}/bots`, { method: 'DELETE' });
    fetchState();
  };

  if (loading) {
    return <div className="app">Loading...</div>;
  }

  return (
    <div className="app">
      <h1>McDonald Order Controller</h1>
      <p className="subtitle">
        Frontend UI consuming backend REST API (polling)
      </p>

      {/* Controls */}
      <div className="controls">
        <button onClick={() => createOrder(OrderType.NORMAL)}>
          New Normal Order
        </button>
        <button onClick={() => createOrder(OrderType.VIP)}>
          New VIP Order
        </button>
        <button onClick={addBot}>+ Bot</button>
        <button onClick={removeBot} disabled={bots.length === 0}>
          - Bot
        </button>
      </div>

      {/* Layout */}
      <div className="layout">
        {/* Pending */}
        <section className="panel">
          <h2>Pending Orders</h2>
          {pending.length === 0 && (
            <p className="empty">No pending orders</p>
          )}
          <ul>
            {pending.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </ul>
        </section>

        {/* Completed */}
        <section className="panel">
          <h2>Completed Orders</h2>
          {completed.length === 0 && (
            <p className="empty">No completed orders</p>
          )}
          <ul>
            {completed.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </ul>
        </section>

        {/* Bots */}
        <section className="panel">
          <h2>Bots</h2>
          {bots.length === 0 && (
            <p className="empty">No bots</p>
          )}
          <ul>
            {bots.map((b) => (
              <BotCard key={b.id} bot={b} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
