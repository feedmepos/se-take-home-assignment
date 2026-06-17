// --------------------------------------------------------------------------
// Pure formatting helper — kept in core so it's deterministic under faked
// Date in tests and reusable from a CLI without importing React/DOM.
// --------------------------------------------------------------------------

/**
 * Formats an epoch-ms timestamp to HH:MM:SS (UTC) for display on completed orders.
 * UTC avoids timezone-dependent test output (tests set system time in UTC).
 */
export function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
