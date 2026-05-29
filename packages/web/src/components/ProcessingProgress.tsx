import type { Order } from "@feedme/core";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function getProcessingProgress(
  order: Order,
  currentTime: number,
  processDurationMs: number,
): number {
  if (!order.processingStartedAt) {
    return 0;
  }
  const elapsed = currentTime - order.processingStartedAt;
  return Math.min(Math.max(elapsed / processDurationMs, 0), 1);
}

export function ProcessingProgress({
  currentTime,
  order,
  processDurationMs,
}: {
  currentTime: number;
  order: Order;
  processDurationMs: number;
}) {
  const progress = getProcessingProgress(order, currentTime, processDurationMs);
  const progressPercent = Math.round(progress * 100);

  return (
    <div className="processing-progress">
      <div className="progress-row">
        <span>Progress</span>
        <strong>{formatPercent(progress)}</strong>
      </div>
      <div
        aria-label={`Order #${order.id} processing progress`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progressPercent}
        className="progress-track"
        role="progressbar"
      >
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
