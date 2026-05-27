export const formatSecondsLeft = (endsAt: number | undefined, now: number) => {
  if (!endsAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((endsAt - now) / 1000));
};

export const formatClock = (timestamp: number) => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
};
