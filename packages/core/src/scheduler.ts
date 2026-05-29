export interface SchedulerHandle {
  id: ReturnType<typeof setTimeout> | number;
}

export interface Scheduler {
  now(): number;
  schedule(delayMs: number, callback: () => void): SchedulerHandle;
  clear(handle: SchedulerHandle): void;
}

export class RealScheduler implements Scheduler {
  now(): number {
    return Date.now();
  }

  schedule(delayMs: number, callback: () => void): SchedulerHandle {
    const timeout = setTimeout(callback, delayMs);
    return { id: timeout };
  }

  clear(handle: SchedulerHandle): void {
    clearTimeout(handle.id as ReturnType<typeof setTimeout>);
  }
}

interface FakeTask {
  handle: SchedulerHandle;
  runAt: number;
  callback: () => void;
}

export class FakeScheduler implements Scheduler {
  private currentTime: number;

  private nextId = 1;

  private tasks: FakeTask[] = [];

  constructor(startTime = Date.UTC(2026, 0, 1, 14, 32, 0)) {
    this.currentTime = startTime;
  }

  now(): number {
    return this.currentTime;
  }

  schedule(delayMs: number, callback: () => void): SchedulerHandle {
    const handle = { id: this.nextId++ };
    this.tasks.push({
      handle,
      runAt: this.currentTime + delayMs,
      callback,
    });
    this.tasks.sort(
      (left, right) =>
        left.runAt - right.runAt || (left.handle.id as number) - (right.handle.id as number),
    );
    return handle;
  }

  clear(handle: SchedulerHandle): void {
    this.tasks = this.tasks.filter((task) => task.handle.id !== handle.id);
  }

  advanceBy(ms: number): void {
    this.advanceTo(this.currentTime + ms);
  }

  advanceTo(targetTime: number): void {
    while (true) {
      const nextTask = this.tasks[0];
      if (!nextTask || nextTask.runAt > targetTime) {
        break;
      }
      this.tasks.shift();
      this.currentTime = nextTask.runAt;
      nextTask.callback();
    }
    this.currentTime = targetTime;
  }
}
