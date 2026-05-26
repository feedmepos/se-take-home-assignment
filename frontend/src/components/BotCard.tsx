import type { Bot } from '../types';

interface BotCardProps {
  bot: Bot;
}

export default function BotCard({ bot }: BotCardProps) {
  const isProcessing = bot.status === 'PROCESSING';
  return (
    <div
      style={{
        border: `2px solid ${isProcessing ? '#2196f3' : '#e0e0e0'}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '8px',
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <strong style={{ fontSize: '16px' }}>{bot.name}</strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isProcessing && bot.currentOrderId && (
          <span style={{ fontSize: '13px', color: '#666' }}>
            处理中: Order-{bot.currentOrderId}
          </span>
        )}
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 'bold',
            background: isProcessing ? '#e3f2fd' : '#e8f5e9',
            color: isProcessing ? '#1976d2' : '#388e3c',
          }}
        >
          {bot.status}
        </span>
      </div>
    </div>
  );
}
