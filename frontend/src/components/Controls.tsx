interface ControlsProps {
  onNewNormal: () => void;
  onNewVip: () => void;
  onAddBot: () => void;
  onDelBot: () => void;
}

export function Controls({
  onNewNormal,
  onNewVip,
  onAddBot,
  onDelBot,
}: ControlsProps): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="btn btn-info"
        onClick={onNewNormal}
      >
        New Order
      </button>
      <button
        className="btn btn-secondary"
        onClick={onNewVip}
      >
        New VIP Order
      </button>
      <button
        className="btn btn-success"
        onClick={onAddBot}
      >
        + Bot
      </button>
      <button
        className="btn btn-error"
        onClick={onDelBot}
      >
        - Bot
      </button>
    </div>
  );
}
