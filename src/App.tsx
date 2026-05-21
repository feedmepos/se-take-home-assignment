import { useState, useEffect } from 'react';
import { Order, OrderType, OrderStatus, Bot, BotStatus } from './types';
import './App.css';

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [nextBotId, setNextBotId] = useState(1);

  const createOrder = (type: OrderType) => {
    const newOrder: Order = {
      id: nextOrderId,
      type,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
    };

    setOrders(prevOrders => {
      // Insert VIP orders ahead of normal orders but behind existing VIP orders
      if (type === OrderType.VIP) {
        const pendingOrders = prevOrders.filter(o => o.status === OrderStatus.PENDING);
        const lastVipIndex = pendingOrders.findLastIndex(o => o.type === OrderType.VIP);
        
        if (lastVipIndex === -1) {
          // No VIP orders, insert at the beginning
          return [newOrder, ...prevOrders];
        } else {
          // Find the actual index in the full array
          const lastVipOrder = pendingOrders[lastVipIndex];
          const actualIndex = prevOrders.findIndex(o => o.id === lastVipOrder.id);
          const newOrders = [...prevOrders];
          newOrders.splice(actualIndex + 1, 0, newOrder);
          return newOrders;
        }
      } else {
        // Normal orders go to the end
        return [...prevOrders, newOrder];
      }
    });

    setNextOrderId(prev => prev + 1);
  };

  const addBot = () => {
    const newBot: Bot = {
      id: nextBotId,
      status: BotStatus.IDLE,
      currentOrderId: null,
    };

    setBots(prev => [...prev, newBot]);
    setNextBotId(prev => prev + 1);
  };

  const removeBot = () => {
    if (bots.length === 0) return;

    // Remove the newest bot (last in array)
    const botToRemove = bots[bots.length - 1];
    
    if (botToRemove.currentOrderId !== null) {
      // Return the order to pending
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === botToRemove.currentOrderId
            ? { ...order, status: OrderStatus.PENDING }
            : order
        )
      );
    }

    setBots(prev => prev.slice(0, -1));
  };

  // Process orders with idle bots
  useEffect(() => {
    const idleBot = bots.find(bot => bot.status === BotStatus.IDLE);
    const pendingOrder = orders.find(o => o.status === OrderStatus.PENDING);

    if (idleBot && pendingOrder) {
      // Assign order to bot
      setBots(prevBots =>
        prevBots.map(bot =>
          bot.id === idleBot.id
            ? { ...bot, status: BotStatus.PROCESSING, currentOrderId: pendingOrder.id }
            : bot
        )
      );

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === pendingOrder.id
            ? { ...order, status: OrderStatus.PROCESSING }
            : order
        )
      );

      // Complete order after 10 seconds
      setTimeout(() => {
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === pendingOrder.id
              ? { ...order, status: OrderStatus.COMPLETE, completedAt: new Date() }
              : order
          )
        );

        setBots(prevBots =>
          prevBots.map(bot =>
            bot.id === idleBot.id
              ? { ...bot, status: BotStatus.IDLE, currentOrderId: null }
              : bot
          )
        );
      }, 10000);
    }
  }, [orders, bots]);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING);
  const processingOrders = orders.filter(o => o.status === OrderStatus.PROCESSING);
  const completeOrders = orders.filter(o => o.status === OrderStatus.COMPLETE);

  return (
    <div className="app">
      <header>
        <h1>🍔 McDonald's Order Management System</h1>
      </header>

      <div className="controls">
        <div className="control-group">
          <h3>Orders</h3>
          <button onClick={() => createOrder(OrderType.NORMAL)} className="btn btn-normal">
            New Normal Order
          </button>
          <button onClick={() => createOrder(OrderType.VIP)} className="btn btn-vip">
            New VIP Order
          </button>
        </div>

        <div className="control-group">
          <h3>Bots ({bots.length})</h3>
          <button onClick={addBot} className="btn btn-add">
            + Bot
          </button>
          <button onClick={removeBot} className="btn btn-remove" disabled={bots.length === 0}>
            - Bot
          </button>
        </div>
      </div>

      <div className="bot-status">
        <h3>Bot Status</h3>
        <div className="bots">
          {bots.length === 0 ? (
            <p className="empty">No bots available</p>
          ) : (
            bots.map(bot => (
              <div key={bot.id} className={`bot ${bot.status.toLowerCase()}`}>
                <strong>Bot #{bot.id}</strong>
                <span className="status">{bot.status}</span>
                {bot.currentOrderId && <span className="order-id">Order #{bot.currentOrderId}</span>}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="order-sections">
        <div className="order-section pending">
          <h2>⏳ PENDING ({pendingOrders.length})</h2>
          <div className="orders">
            {pendingOrders.length === 0 ? (
              <p className="empty">No pending orders</p>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className={`order ${order.type.toLowerCase()}`}>
                  <strong>Order #{order.id}</strong>
                  <span className="type">{order.type}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="order-section processing">
          <h2>🔄 PROCESSING ({processingOrders.length})</h2>
          <div className="orders">
            {processingOrders.length === 0 ? (
              <p className="empty">No orders being processed</p>
            ) : (
              processingOrders.map(order => (
                <div key={order.id} className={`order ${order.type.toLowerCase()}`}>
                  <strong>Order #{order.id}</strong>
                  <span className="type">{order.type}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="order-section complete">
          <h2>✅ COMPLETE ({completeOrders.length})</h2>
          <div className="orders">
            {completeOrders.length === 0 ? (
              <p className="empty">No completed orders</p>
            ) : (
              completeOrders.map(order => (
                <div key={order.id} className={`order ${order.type.toLowerCase()}`}>
                  <strong>Order #{order.id}</strong>
                  <span className="type">{order.type}</span>
                  {order.completedAt && (
                    <span className="time">
                      {order.completedAt.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
