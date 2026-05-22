import React from 'react'

interface ControlsProps {
  onAddNormal: () => void
  onAddVip: () => void
  onAddBot: () => void
  onRemoveBot: () => void
  botCount: number
}

export const Controls: React.FC<ControlsProps> = ({ onAddNormal, onAddVip, onAddBot, onRemoveBot, botCount }) => (
  <nav className="menu-bar">
    <button onClick={onAddNormal}>New Normal</button>
    <button className="vip" onClick={onAddVip}>New VIP</button>
    <button onClick={onAddBot}>+ Bot</button>
    <button onClick={onRemoveBot} disabled={botCount === 0} className="danger">- Bot</button>
    <div className="status">Bots: <strong>{botCount}</strong></div>
  </nav>
)
