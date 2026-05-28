import React from 'react'

export default function Controls({ onAddNormal, onAddVIP, onAddBot, onRemoveBot }) {
  return (
    <div className="controls">
      <button className="ctrl-btn normal" onClick={onAddNormal}>
        <span className="ctrl-icon">📋</span>
        <span className="ctrl-label">New Order</span>
        <span className="ctrl-sub">Normal</span>
      </button>
      <button className="ctrl-btn vip" onClick={onAddVIP}>
        <span className="ctrl-icon">⭐</span>
        <span className="ctrl-label">VIP Order</span>
        <span className="ctrl-sub">Priority</span>
      </button>
      <div className="ctrl-divider" />
      <button className="ctrl-btn bot-add" onClick={onAddBot}>
        <span className="ctrl-icon">🤖</span>
        <span className="ctrl-label">Add Bot</span>
        <span className="ctrl-sub">+1 worker</span>
      </button>
      <button className="ctrl-btn bot-del" onClick={onRemoveBot}>
        <span className="ctrl-icon">💀</span>
        <span className="ctrl-label">Del Bot</span>
        <span className="ctrl-sub">-1 worker</span>
      </button>
    </div>
  )
}
