interface ControlPanelProps {
  onNewNormalOrder: () => void;
  onNewVipOrder: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
  canRemoveBot: boolean;
}

export function ControlPanel({
  onNewNormalOrder,
  onNewVipOrder,
  onAddBot,
  onRemoveBot,
  canRemoveBot,
}: ControlPanelProps) {
  return (
    <section className="controls" aria-label="Order and bot controls">
      <div className="controls__group">
        <button
          type="button"
          className="btn btn--normal"
          onClick={onNewNormalOrder}
          aria-label="Create new normal order"
        >
          New Normal Order
        </button>
        <button
          type="button"
          className="btn btn--vip"
          onClick={onNewVipOrder}
          aria-label="Create new VIP order"
        >
          New VIP Order
        </button>
      </div>
      <div className="controls__group">
        <button
          type="button"
          className="btn btn--bot-add"
          onClick={onAddBot}
          aria-label="Add cooking bot"
        >
          + Bot
        </button>
        <button
          type="button"
          className="btn btn--bot-remove"
          onClick={onRemoveBot}
          disabled={!canRemoveBot}
          aria-label="Remove newest cooking bot"
        >
          - Bot
        </button>
      </div>
    </section>
  );
}
