import type { ReactNode } from "react";
import type { Bot, Order } from "@feedme/core";

export function StatusColumn<T extends Order | Bot>({
  detail,
  emptyMessage,
  items,
  onSelect,
  renderItem,
  subtitle,
  title,
}: {
  detail?: string;
  emptyMessage: string;
  items: T[];
  onSelect: (value: T) => void;
  renderItem: (value: T) => ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="status-column">
      <div className="status-header">
        <div className="status-title-row">
          <h2>{title}</h2>
          <span className="status-count" aria-label={`${title} count`}>
            {items.length}
          </span>
          {detail ? (
            <span className="status-detail" aria-label={`${title} detail`}>
              {detail}
            </span>
          ) : null}
        </div>
        <p>{subtitle}</p>
      </div>
      <div className="status-list">
        {items.length === 0 ? (
          <p className="empty-state">{emptyMessage}</p>
        ) : null}
        {items.map((item) => (
          <button
            className="status-card"
            key={item.id}
            onClick={() => onSelect(item)}
            type="button"
          >
            {renderItem(item)}
          </button>
        ))}
      </div>
    </section>
  );
}
