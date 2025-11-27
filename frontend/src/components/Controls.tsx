import React from 'react'

interface ControlsProps {
  onAddNormal: () => void
  onAddVip: () => void
  onAddBot: () => void
  onRemoveBot: () => void
  botCount: number
  processingSeconds: number
  onChangeProcessingSeconds: (secs: number) => void
}

export const Controls: React.FC<ControlsProps> = ({ onAddNormal, onAddVip, onAddBot, onRemoveBot, botCount, processingSeconds, onChangeProcessingSeconds }) => (
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
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
        <span style={{ fontSize: '.75rem', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#6b7280' }}>Seconds per order</span>
        <input
          type="number"
          min={1}
          value={processingSeconds}
          onChange={e => onChangeProcessingSeconds(Math.max(1, Number(e.target.value)))}
          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '.85rem', width: 120 }}
        />
      </label>
    </div>
  </section>
)
