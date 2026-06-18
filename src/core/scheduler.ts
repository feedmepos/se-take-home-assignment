// --------------------------------------------------------------------------
// Time is injected via this interface so the core stays pure and testable.
// Unit tests rely on vi.useFakeTimers() which patches the globals that
// systemScheduler delegates to — no separate fake scheduler needed.
// --------------------------------------------------------------------------

export type TimerHandle = ReturnType<typeof setTimeout>;

export interface Scheduler {
  now(): number;
  setTimeout(fn: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

/** Default scheduler: thin wrappers around real globals. */
export const systemScheduler: Scheduler = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};
