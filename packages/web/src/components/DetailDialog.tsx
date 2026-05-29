/*
 * @Author: Zdd
 * @Date: 2026-05-29 16:22:08
 * @LastEditors: Zdd 445305451@qq.com
 * @LastEditTime: 2026-05-29 16:56:50
 * @FilePath: DetailDialog.tsx
 */
import type { Bot, Order } from "@feedme/core";

import { formatTime } from "../lib/format";
import { ProcessingProgress } from "./ProcessingProgress";

export type SelectedEntity =
  | { kind: "order"; value: Order }
  | { kind: "bot"; value: Bot }
  | null;

export function DetailDialog({
  currentTime,
  onClose,
  processDurationMs,
  selected,
}: {
  currentTime: number;
  onClose: () => void;
  processDurationMs: number;
  selected: NonNullable<SelectedEntity>;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby="detail-dialog-title"
        aria-modal="true"
        className="detail-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <div>
            <h2 id="detail-dialog-title">
              {selected.kind === "order"
                ? `Order #${selected.value.id}`
                : `Bot #${selected.value.id}`}
            </h2>
          </div>
          <button
            aria-label="Close detail dialog"
            className="dialog-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {selected.kind === "order" ? (
          <>
            <p>Status: {selected.value.status}</p>
            <p>Priority: {selected.value.priority}</p>
            <p>Created: {formatTime(selected.value.createdAt)}</p>
            <p>
              Processing started:{" "}
              {formatTime(selected.value.processingStartedAt)}
            </p>
            <p>Completed: {formatTime(selected.value.completedAt)}</p>
            <p>
              Assigned bot:{" "}
              {selected.value.assignedBotId
                ? `#${selected.value.assignedBotId}`
                : "--"}
            </p>
            {selected.value.status === "processing" ? (
              <ProcessingProgress
                currentTime={currentTime}
                order={selected.value}
                processDurationMs={processDurationMs}
              />
            ) : null}
          </>
        ) : (
          <>
            <p>Status: {selected.value.status}</p>
            <p>Created: {formatTime(selected.value.createdAt)}</p>
            <p>
              Current order:{" "}
              {selected.value.currentOrderId
                ? `#${selected.value.currentOrderId}`
                : "Idle"}
            </p>
            <p>Completed orders: {selected.value.completedOrders}</p>
          </>
        )}
      </section>
    </div>
  );
}
