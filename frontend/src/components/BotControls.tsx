interface BotControlsProps {
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

export default function BotControls({ onAdd, onRemove, disabled }: BotControlsProps) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
      <button
        onClick={onAdd}
        disabled={disabled}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: '#4caf50',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        + Bot
      </button>
      <button
        onClick={onRemove}
        disabled={disabled}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: '#f44336',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        - Bot
      </button>
    </div>
  );
}
