import type { LogEntry } from '../domain/types';

interface EventLogProps {
  entries: LogEntry[];
}

export function EventLog({ entries }: EventLogProps) {
  return (
    <section className="event-log" aria-label="Event log">
      <header className="event-log__header">
        <h2>Event Log</h2>
      </header>
      <div className="event-log__content">
        {entries.length === 0 ? (
          <p className="event-log__empty">Actions will appear here with timestamps.</p>
        ) : (
          <ul className="event-log__list" aria-live="polite" aria-relevant="additions">
            {entries.map((entry) => (
              <li key={entry.id}>
                <span className="event-log__time">[{entry.time}]</span> {entry.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
