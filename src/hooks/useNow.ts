import { useEffect, useState } from 'react'

/**
 * Returns a `Date.now()` value that refreshes on an interval, so components can
 * render live countdowns for in-progress orders. Purely presentational — the
 * controller owns the real timers; this just drives the visual tick.
 *
 * The interval only runs while `active` is true (i.e. a bot is actually
 * cooking), so an idle app does no needless re-rendering.
 */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])
  return now
}
