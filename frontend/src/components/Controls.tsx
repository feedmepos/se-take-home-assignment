interface ControlsProps {
  onNewNormal: () => void;
  onNewVip: () => void;
  onAddBot: () => void;
  onDelBot: () => void;
  disabled?: boolean;
}

export function Controls({
  onNewNormal,
  onNewVip,
  onAddBot,
  onDelBot,
  disabled = false,
}: ControlsProps): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="btn btn-primary"
        onClick={onNewNormal}
        disabled={disabled}
      >
        New Normal Order
      </button>
      <button
        className="btn btn-secondary"
        onClick={onNewVip}
        disabled={disabled}
      >
        New VIP Order
      </button>
      <button
        className="btn btn-success"
        onClick={onAddBot}
        disabled={disabled}
      >
        + Bot
      </button>
      <button
        className="btn btn-error"
        onClick={onDelBot}
        disabled={disabled}
      >
        - Bot
      </button>
    </div>
  );
}
