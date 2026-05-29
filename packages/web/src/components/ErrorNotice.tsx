export function ErrorNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="error-alert" role="alert">
      <span className="error-alert-icon" aria-hidden="true">
        !
      </span>
      <div className="error-alert-copy">
        <strong>Something needs attention</strong>
        <span>{message}</span>
      </div>
      <button
        aria-label="Dismiss error"
        className="error-alert-dismiss"
        onClick={onDismiss}
        type="button"
      >
        Dismiss
      </button>
    </div>
  );
}
