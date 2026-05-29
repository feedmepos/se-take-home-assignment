import React, { useState, useEffect } from 'react';
import { useOrderSystem } from '../../hooks/useOrderSystem';
import './Home.css';

/**
 * 首页组件 - 订单控制面板
 */
const Home: React.FC = () => {
  const { orders, completedOrders, bots, addOrder, addBot, removeBot } = useOrderSystem();
  const [now, setNow] = useState(() => Date.now());

  // 每 100ms 更新一次当前时间，用于进度条展示
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const vipPendingOrders = orders.filter(o => o.status === 'PENDING' && o.type === 'VIP');
  const normalPendingOrders = orders.filter(o => o.status === 'PENDING' && o.type === 'NORMAL');

  const calculateProgress = (startTime?: number, endTime?: number) => {
    if (!startTime || !endTime) return 0;
    const total = endTime - startTime;
    const elapsed = now - startTime;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  return (
    <div className="container">
      <header className="header">
        <h1>McDonald's Ordering System</h1>
        <div className="controls">
          <button onClick={() => addOrder('NORMAL')} className="btn btn-normal">
            New Normal Order
          </button>
          <button onClick={() => addOrder('VIP')} className="btn btn-vip">
            New VIP Order
          </button>
          <button onClick={addBot} className="btn btn-add-bot">
            + Bot
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="section bots-section">
          <h2>Bots ({bots.length})</h2>
          <div className="bot-list">
            {bots.length === 0 && <p className="empty-msg">No bots available</p>}
            {bots.map(bot => {
              const progress = calculateProgress(bot.startTime, bot.endTime);
              const processingOrder = orders.find(o => o.id === bot.processingOrderId);
              return (
                <div key={bot.id} className={`bot-item ${bot.status.toLowerCase()}`}>
                  <div className="bot-info">
                    <div className="bot-id-group">
                      <span className="bot-id">Bot #{bot.id}</span>
                      <button 
                        onClick={() => removeBot(bot.id)} 
                        className="btn-delete-bot"
                        title="Delete Bot"
                      >
                        ×
                      </button>
                    </div>
                    <div className="bot-status-container">
                      {bot.status === 'WORKING' ? (
                        <div className="processing-order-info">
                          <span className="bot-status">Processing #{bot.processingOrderId}</span>
                          {processingOrder && (
                            <span className={`order-badge ${processingOrder.type.toLowerCase()}`}>
                              {processingOrder.type}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="bot-status">IDLE</span>
                      )}
                    </div>
                  </div>
                  {bot.status === 'WORKING' && (
                    <div className="progress-container">
                      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="pending-queues">
          <section className="section pending-section vip">
            <h2>VIP PENDING</h2>
            <div className="order-list">
              {vipPendingOrders.length === 0 && <p className="empty-msg">No VIP orders</p>}
              {vipPendingOrders.map(order => (
                <div key={order.id} className={`order-item vip pending`}>
                  <div className="order-main">
                    <span className="order-id">#{order.id}</span>
                    {order.requeuedAt && <span className="requeued-tag">REQUEUED</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="section pending-section normal">
            <h2>NORMAL PENDING</h2>
            <div className="order-list">
              {normalPendingOrders.length === 0 && <p className="empty-msg">No normal orders</p>}
              {normalPendingOrders.map(order => (
                <div key={order.id} className={`order-item normal pending`}>
                  <div className="order-main">
                    <span className="order-id">#{order.id}</span>
                    {order.requeuedAt && <span className="requeued-tag">REQUEUED</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="section complete-section">
          <h2>COMPLETE</h2>
          <div className="order-list">
            {completedOrders.length === 0 && <p className="empty-msg">No completed orders</p>}
            {completedOrders.map(order => (
              <div key={order.id} className={`order-item complete`}>
                <div className="order-main">
                  <span className="order-id">#{order.id}</span>
                  <span className={`order-badge ${order.type.toLowerCase()}`}>{order.type}</span>
                </div>
                <span className="order-status-text">DONE</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
