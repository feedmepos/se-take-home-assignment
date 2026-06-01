import type { Clock, CancelHandle } from './Clock';

interface ScheduledTimer {
  at: number;
  seq: number;
  fn: () => void;
  cancelled: boolean;
}

/**
 * 虚拟时钟。通过 advance(ms) 手动推进时间并同步触发到期回调,
 * 使「10 秒处理」可瞬时、确定地验证,杜绝 flaky 测试。
 */
export class FakeClock implements Clock {
  private current = 0;
  private seqCounter = 0;
  private timers: ScheduledTimer[] = [];

  now(): number {
    return this.current;
  }

  setTimeout(fn: () => void, ms: number): CancelHandle {
    const timer: ScheduledTimer = {
      at: this.current + ms,
      seq: this.seqCounter++,
      fn,
      cancelled: false,
    };
    this.timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  }

  /**
   * 推进虚拟时间 ms 毫秒,按到期时间(同刻按注册顺序)依次触发回调。
   * 回调中新注册的、落在本次窗口内的定时器也会在同一次 advance 中触发。
   */
  advance(ms: number): void {
    const target = this.current + ms;
    for (;;) {
      const next = this.nextDueTimer(target);
      if (!next) break;
      this.timers = this.timers.filter((t) => t !== next);
      this.current = next.at;
      next.fn();
    }
    this.current = target;
  }

  private nextDueTimer(target: number): ScheduledTimer | null {
    let candidate: ScheduledTimer | null = null;
    for (const t of this.timers) {
      if (t.cancelled || t.at > target) continue;
      if (!candidate || t.at < candidate.at || (t.at === candidate.at && t.seq < candidate.seq)) {
        candidate = t;
      }
    }
    return candidate;
  }
}
