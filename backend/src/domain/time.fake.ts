import { Clock, Scheduler, CancelHandle } from './time';

interface Task {
  at: number;
  cb: () => void;
}

export class FakeClock implements Clock, Scheduler {
  private current: number;
  private tasks: Task[] = [];
  constructor(start = new Date('2025-01-01T00:00:00Z')) {
    this.current = start.getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  schedule(delayMs: number, cb: () => void): CancelHandle {
    const task: Task = { at: this.current + delayMs, cb };
    this.tasks.push(task);
    return () => {
      this.tasks = this.tasks.filter((t) => t !== task);
    };
  }

  advance(ms: number): void {
    const target = this.current + ms;
    // Fire due tasks in chronological order; tasks scheduled during a callback
    // are picked up if they fall within the window.
    for (;;) {
      const due = this.tasks.filter((t) => t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.tasks = this.tasks.filter((t) => t !== due);
      this.current = due.at;
      due.cb();
    }
    this.current = target;
  }
}
