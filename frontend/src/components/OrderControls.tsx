interface OrderControlsProps {
  onNewNormal: () => void;
  onNewVip: () => void;
  disabled?: boolean;
}

export default function OrderControls({ onNewNormal, onNewVip, disabled }: OrderControlsProps) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
      <button
        onClick={onNewNormal}
        disabled={disabled}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: '#2196f3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        New Normal Order
      </button>
      <button
        onClick={onNewVip}
        disabled={disabled}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: '#ff9800',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        New VIP Order
      </button>
    </div>
  );
}
