"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [orders, setOrders] = useState<Array<{id: number, type: string, status: string}>>([]);
  const [bots, setBots] = useState<Array<{id: number, status: string, orderId: string | null}>>([]);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      console.log('fetchOrders response', response);
      if (response.ok) {
        const ordersData = await response.json();
        setOrders(ordersData);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots');
      if (response.ok) {
        const botsData = await response.json();
        setBots(botsData);
      } else {
        console.error('Failed to fetch bots');
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchBots();
    const interval = setInterval(() => {
      fetchOrders();
      fetchBots();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const createOrder = async (type: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });
      console.log('createOrder response', response);
      if (response.ok) {
        const newOrder = await response.json();
        setOrders([...orders, newOrder]);
      } else {
        console.error('Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const addBot = async () => {
    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const newBot = await response.json();
        setBots([...bots, newBot]);
      } else {
        console.error('Failed to add bot');
      }
    } catch (error) {
      console.error('Error adding bot:', error);
    }
  };

  const removeBot = async () => {
    try {
      const response = await fetch('/api/bots', { method: 'DELETE' });
      if (response.ok) {
        fetchBots();
      } else {
        console.error('Failed to remove bot');
      }
    } catch (error) {
      console.error('Error removing bot:', error);
    }
  };

  const CustomerPanel = () => (
    <section>
      <h2>Customer Panel</h2>
      <button onClick={() => createOrder('NORMAL')}>Create Order</button>
      <button onClick={() => createOrder('VIP')} style={{ marginLeft: 8 }}>Create VIP Order</button>
    </section>
  );

  const AdminPanel = () => (
    <section>
      <h2>Admin Panel</h2>
      <button onClick={addBot}>+bot</button>
      <button onClick={removeBot} style={{ marginLeft: 8 }}>-bot</button>
      <div>current cooking bots: {bots.length}</div>
    </section>
  );

  const OrderList = () => {
    const statusList = ["PENDING", "PROCESSING", "COMPLETE"];
    return (
      <section>
        <h2>Order List</h2>
        <div style={{ display: 'flex', gap: 24 }}>
          {statusList.map((status) => (
            <div key={status} style={{ flex: 1, border: '1px solid #eee', borderRadius: 6, padding: 12, minHeight: 80 }}>
              <strong>{status}</strong>
              <div style={{ marginTop: 8 }}>
                {orders.filter((o) => o.status === status).length === 0 ? (
                  <span>empty</span>
                ) : (
                  orders
                    .filter((o) => o.status === status)
                    .sort((a, b) => {
                      if (a.type === 'VIP' && b.type !== 'VIP') return -1;
                      if (a.type !== 'VIP' && b.type === 'VIP') return 1;
                      return 0;
                    })
                    .map((o) => (
                      <div key={o.id} style={{ marginTop: 4 }}>
                        #{o.id}{o.type === 'VIP'?`(${o.type})`:null}
                      </div>
                    ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif", minHeight: "100vh", padding: 24 }}>
      <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <CustomerPanel />
        </div>
        <div style={{ flex: 1 }}>
          <AdminPanel />
        </div>
      </div>
      <OrderList />
    </main>
  );
}