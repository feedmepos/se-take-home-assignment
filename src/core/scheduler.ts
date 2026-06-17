/** A function that cancels a previously scheduled callback. */
export type CancelTimer = () => void;

/** Abstraction over time — injected into the controller for testability. */
export interface Scheduler {
  /** Returns the current epoch time in milliseconds. */
  now(): number;
  /** Schedules `callback` to run after `delayMs` ms; returns a cancel function. */
  schedule(callback: () => void, delayMs: number): CancelTimer;
}

/** The real-time scheduler using the browser/Node event loop. */
export const systemScheduler: Scheduler = {
  now: () => Date.now(),
  schedule: (callback, delayMs) => {
    const id = setTimeout(callback, delayMs);
    return () => clearTimeout(id);
  },
};
