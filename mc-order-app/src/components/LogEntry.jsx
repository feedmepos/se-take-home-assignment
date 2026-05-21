import { memo } from 'react';

const msgClass = {
  ORDER_CREATED: 'create',
  ORDER_PROCESSING: 'processing',
  ORDER_COMPLETED: 'complete',
  ORDER_RETURNED: 'returned',
  BOT_CREATED: 'bot-add',
  BOT_DESTROYED: 'bot-remove',
};

const LogEntry = memo(function LogEntry({ log }) {
  const time = log.timestamp.toLocaleTimeString('zh-CN', { hour12: false });

  return (
    <div className="log-entry">
      <span className="log-time">{time}</span>
      <span className={`log-msg ${msgClass[log.event] || ''}`}>{log.message}</span>
    </div>
  );
});

export default LogEntry;
