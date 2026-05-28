import React from 'react'
import { useKitchen } from './useKitchen'
import Kitchen         from './components/Kitchen'
import OrderQueue      from './components/OrderQueue'
import CompletedOrders from './components/CompletedOrders'

export default function App() {
  const { orders, bots, completed, toasts, addNormalOrder, addVIPOrder, addBot, removeBot } = useKitchen()

  const pending = orders.filter(o => o.status === 'pending').length

  return (
    <>
      {/* ── Header ── */}
      <header>
        <div className="logo">
          <div className="logo-main">🍔 <span className="y">Kitchen</span> Chaos</div>
          <div className="logo-sub">McDonald's · Bot Kitchen</div>
        </div>

        <div className="stats">
          <div><span className="sv">{pending}</span>待处理</div>
          <div><span className="sv">{bots.length}</span>机器人</div>
          <div><span className="sv">{completed.length}</span>已完成</div>
        </div>

        <div className="header-controls">
          <button className="bo" onClick={addNormalOrder}>📋 普通订单</button>
          <button className="bv" onClick={addVIPOrder}>👑 VIP 订单</button>
          <button className="ba" onClick={addBot}>🤖 +Bot</button>
          <button className="br" onClick={removeBot}>💨 −Bot</button>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="main">
        {/* Left panel */}
        <div className="panel">
          <OrderQueue orders={orders} bots={bots} />
          <CompletedOrders completed={completed} />
        </div>

        {/* Kitchen scene */}
        <Kitchen bots={bots} orders={orders} />
      </div>

      {/* ── Toasts ── */}
      <div className="tbox">
        {toasts.map(t => (
          <div
            key={t.id}
            className="toast"
            style={{ borderLeftColor: t.color }}
            dangerouslySetInnerHTML={{ __html: t.html }}
          />
        ))}
      </div>
    </>
  )
}
