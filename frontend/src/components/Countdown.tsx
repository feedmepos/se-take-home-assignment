import { useState, useEffect } from 'react';

interface CountdownProps {
  startedAt: string;
  cookDurationMs: number;
}

function computeRemaining(startedAt: string, cookDurationMs: number): number {
  return Math.max(
    0,
    Math.ceil((Date.parse(startedAt) + cookDurationMs - Date.now()) / 1000),
  );
}

export function Countdown({ startedAt, cookDurationMs }: CountdownProps): React.ReactElement {
  const [remaining, setRemaining] = useState(() =>
    computeRemaining(startedAt, cookDurationMs),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(computeRemaining(startedAt, cookDurationMs));
    }, 1000);

    return () => {
      clearInterval(id);
    };
  }, [startedAt, cookDurationMs]);

  return <span className="font-semibold tabular-nums text-base-content/70">{remaining}s</span>;
}
