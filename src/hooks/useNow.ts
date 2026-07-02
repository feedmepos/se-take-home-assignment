import { useEffect, useState } from 'react'

/**
 * A clock that ticks only while `active`, used to drive the cook-time countdown.
 * Purely presentational — the controller owns the real completion timers.
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
