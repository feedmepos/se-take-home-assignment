import type { Clock, CancelHandle } from './Clock';

/** 生产环境时钟,基于真实计时器(真实 10 秒处理)。 */
export class RealClock implements Clock {
  now(): number {
    return Date.now();
  }

  setTimeout(fn: () => void, ms: number): CancelHandle {
    const handle = setTimeout(fn, ms);
    return () => clearTimeout(handle);
  }
}
