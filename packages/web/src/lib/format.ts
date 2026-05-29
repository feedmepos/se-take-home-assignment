export function formatTime(timestamp?: number): string {
  if (!timestamp) {
    return "--";
  }
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(timestamp);
}
