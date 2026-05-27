export type CancelHandle = () => void;
export interface Clock {
  now(): Date;
}
export interface Scheduler {
  schedule(delayMs: number, cb: () => void): CancelHandle;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
export class RealScheduler implements Scheduler {
  schedule(delayMs: number, cb: () => void): CancelHandle {
    const t = setTimeout(cb, delayMs);
    return () => clearTimeout(t);
  }
}
