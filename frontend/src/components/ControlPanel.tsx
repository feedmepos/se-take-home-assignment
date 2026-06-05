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
    <section className="controls">
      <div className="controls__group">
        <button type="button" className="btn btn--normal" onClick={onNewNormalOrder}>
          New Normal Order
        </button>
        <button type="button" className="btn btn--vip" onClick={onNewVipOrder}>
          New VIP Order
        </button>
      </div>
      <div className="controls__group">
        <button type="button" className="btn btn--bot-add" onClick={onAddBot}>
          + Bot
        </button>
        <button
          type="button"
          className="btn btn--bot-remove"
          onClick={onRemoveBot}
          disabled={!canRemoveBot}
        >
          - Bot
        </button>
      </div>
    </section>
  );
}
