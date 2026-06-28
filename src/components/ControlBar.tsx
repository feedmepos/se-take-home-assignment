interface Props {
  botCount: number;
  onNewNormal: () => void;
  onNewVip: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
}

export function ControlBar({ botCount, onNewNormal, onNewVip, onAddBot, onRemoveBot }: Props) {
  return (
    <div className="controls">
      <div className="controls__group">
        <button className="btn btn--normal" onClick={onNewNormal}>
          New Normal Order
        </button>
        <button className="btn btn--vip" onClick={onNewVip}>
          New VIP Order
        </button>
      </div>

      <div className="controls__group controls__bots">
        <button className="btn btn--bot" onClick={onRemoveBot} disabled={botCount === 0} aria-label="Remove bot">
          &minus; Bot
        </button>
        <span className="controls__count" aria-live="polite">
          {botCount} {botCount === 1 ? 'bot' : 'bots'}
        </span>
        <button className="btn btn--bot" onClick={onAddBot} aria-label="Add bot">
          + Bot
        </button>
      </div>
    </div>
  );
}
