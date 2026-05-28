import React, { useEffect, useRef, useState } from 'react'

function OrderCard({ order, bots }) {
  const [age, setAge] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setAge(Math.floor((Date.now() - order.createdAt) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [order.createdAt])

  const bot = order.status === 'processing' ? bots.find(b => b.id === order.botId) : null
  const ageStr = age < 60 ? `${age}s 前` : `${Math.floor(age / 60)}m${age % 60}s 前`

  return (
    <div
      className={`ocard ${order.type}${order.status === 'processing' ? ' proc' : ''} card-in`}
      data-oid={order.id}
    >
      <div className="ctop">
        <div className={`cid ${order.type}`}>
          {order.type === 'vip' ? '👑 ' : ''}#{order.id}
        </div>
        <div className={`ctag ${order.type}`}>
          {order.type === 'vip' ? 'VIP' : 'Normal'}
        </div>
      </div>

      <div className="cage">{ageStr}</div>

      {bot && (
        <div className="cbot">🤖 {bot.name} 正在烹饪…</div>
      )}

      {order.status === 'processing' && (
        <div className="cprog">
          <div className="cpfill" style={{ width: `${order.progress.toFixed(1)}%` }} />
        </div>
      )}
    </div>
  )
}

export default function OrderQueue({ orders, bots }) {
  const pending = orders.filter(o => o.status === 'pending').length

  return (
    <div className="pblock pend">
      <div className="plabel">
        📋 待处理 <span className="cnt">{pending}</span>
      </div>
      <div className="olist">
        {orders.map(order => (
          <OrderCard key={order.id} order={order} bots={bots} />
        ))}
      </div>
    </div>
  )
}
