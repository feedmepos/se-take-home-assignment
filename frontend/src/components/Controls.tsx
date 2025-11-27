import React from 'react'

interface ControlsProps {
  onAddNormal: () => void
  onAddVip: () => void
  onAddBot: () => void
  onRemoveBot: () => void
  botCount: number
}

export const Controls: React.FC<ControlsProps> = ({ onAddNormal, onAddVip, onAddBot, onRemoveBot, botCount }) => (
  <section className="controls">
    <div className="control-group">
      <h2>New Order</h2>
      <div className="button-row">
        <button onClick={onAddNormal}>New Normal Order</button>
        <button className="vip" onClick={onAddVip}>New VIP Order</button>
      </div>
    </div>

    <div className="control-group">
      <h2>Cooking Bots</h2>
      <div className="button-row">
        <button onClick={onAddBot}>+ Bot</button>
        <button onClick={onRemoveBot} disabled={botCount === 0} className="danger">- Bot</button>
      </div>
      <p className="bots-summary">Active bots: <strong>{botCount}</strong></p>
    </div>
  </section>
)
