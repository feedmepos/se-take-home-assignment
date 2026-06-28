import { ControllerState } from "../domain/orderController";
import { formatTime } from "../utils/formatTime";

type LogEntry = ControllerState["log"][number];

interface ActivityLogProps {
  entries: LogEntry[];
}

export function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <section className="activity" aria-label="事件日志">
      <div className="section-heading">
        <h2>事件日志</h2>
        <span className="wide-badge">{entries.length} 条事件</span>
      </div>
      {entries.length ? (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id}>
              <time>{formatTime(entry.at)}</time>
              <span>{entry.message}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-copy">暂无事件</p>
      )}
    </section>
  );
}
