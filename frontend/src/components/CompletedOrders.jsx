import React from 'react'

export default function CompletedOrders({ completed }) {
  if (completed.length === 0) return null

  return (
    <div className="pblock done">
      <div className="plabel">
        ✅ 已完成 <span className="cnt">{completed.length}</span>
      </div>
      <div className="chips">
        {completed.map(o => (
          <div key={o.id} className={`chip ${o.type}`}>
            {o.type === 'vip' ? '👑 ' : ''}#{o.id}
          </div>
        ))}
      </div>
    </div>
  )
}
