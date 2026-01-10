export interface Clock {
  nowMs(): number;
  sleep(ms: number): Promise<void>;
}

export class RealClock implements Clock {
  nowMs(): number {
    return Date.now();
  }
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
