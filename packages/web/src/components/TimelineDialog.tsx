import type { DomainEvent } from "@feedme/core";

import { formatTime } from "../lib/format";

export function TimelineDialog({
  events,
  onClose,
}: {
  events: DomainEvent[];
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby="timeline-dialog-title"
        aria-modal="true"
        className="timeline-panel timeline-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="timeline-header">
          <div>
            <h2 id="timeline-dialog-title">Event Timeline</h2>
            <span>Latest 20 domain events</span>
          </div>
          <button
            aria-label="Close timeline dialog"
            className="dialog-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="timeline-list">
          {events.length === 0 ? (
            <p className="empty-state">No live events yet.</p>
          ) : null}
          {events.map((event) => (
            <div
              className="timeline-item"
              key={`${event.id}-${event.timestamp}-${event.type}`}
            >
              <span>{formatTime(event.timestamp)}</span>
              <strong>{event.message}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
