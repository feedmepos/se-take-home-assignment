import React from 'react'
import { Bot } from '../types'

export const BotCard: React.FC<{ bot: Bot; progress: number }> = ({ bot: b, progress }) => (
  <div className={`bot-card ${b.status === 'WORKING' ? 'working' : ''}`}>
    <div className="top-row">
      <div className="bot-id">🤖 Bot #{b.id}</div>
      <span className={`chip ${b.status === 'WORKING' ? 'chip-working' : 'chip-idle'}`}>{b.status}</span>
    </div>
    <div className="order-line">Order: {b.currentOrder ? `#${b.currentOrder.id}` : '-'}</div>
    <div className="progress" aria-hidden={b.status === 'IDLE'}>
      <div className="bar" style={{ width: `${progress}%` }} />
    </div>
    {b.status === 'WORKING' && b.currentOrder && (
      <div style={{ fontSize: 12, opacity: .8, marginTop: 6 }}>
        Processing: {((Date.now() - (b.currentOrder.startedAt || Date.now())) / 1000).toFixed(1)}s / 10s
      </div>
    )}
  </div>
)
