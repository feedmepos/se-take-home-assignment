// --------------------------------------------------------------------------
// Isolated countdown leaf — has its own interval and re-renders only itself.
// The board (pending/complete columns) must never re-render because of ticking.
// --------------------------------------------------------------------------

'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  endsAt: number; // epoch ms
}

export function Countdown({ endsAt }: CountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
  );

  useEffect(() => {
    // Tick every 200ms for smooth updates; derive from endsAt to avoid drift
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span className="text-sm font-mono font-bold text-blue-700 tabular-nums">{secondsLeft}s</span>
  );
}
