import { useOrder } from '../store/OrderContext';
import LogEntry from './LogEntry';

export default function ActivityLog() {
  const { state } = useOrder();

  if (state.role !== 'manager') return null;

  return (
    <div className="activity-log" style={{ marginTop: 20 }}>
      <h3>
        <span className="dot" />
        活动日志 ({state.logs.length})
      </h3>
      {state.logs.length === 0 ? (
        <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>暂无日志</div>
      ) : (
        state.logs.map(log => (
          <LogEntry key={log.id} log={log} />
        ))
      )}
    </div>
  );
}
