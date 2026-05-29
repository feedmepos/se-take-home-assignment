export function ActionPanelHeader({
  hint,
  kicker,
  title,
}: {
  hint: string;
  kicker: string;
  title: string;
}) {
  return (
    <span className="hover-hint" tabIndex={0}>
      <span
        className="panel-kicker hover-kicker"
        aria-label={`${title} rule details`}
      >
        <span>{kicker}</span>
        <svg
          aria-hidden="true"
          className="hover-kicker-icon"
          viewBox="0 0 16 16"
        >
          <circle
            cx="8"
            cy="8"
            r="6.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path
            d="M8 7.1V10.2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.25"
          />
          <circle cx="8" cy="4.8" r="0.8" fill="currentColor" />
        </svg>
      </span>
      <span className="hover-hint-bubble" role="note">
        <strong>{title}</strong>
        <span>{hint}</span>
      </span>
    </span>
  );
}
