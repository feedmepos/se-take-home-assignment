'use strict';

// Used only by the scripted demo and tests so 10-second cooks run instantly.
class VirtualClock {
  constructor(start = Date.parse('2026-01-01T12:00:00Z')) {
    this.current = start;
    this.nextTimerId = 1;
    this.timers = new Map();
  }

  now() { return new Date(this.current); }

  setTimeout(callback, delay) {
    const id = this.nextTimerId++;
    this.timers.set(id, { at: this.current + delay, callback });
    return id;
  }

  clearTimeout(id) { this.timers.delete(id); }

  advance(ms) {
    if (!Number.isFinite(ms) || ms < 0) throw new Error('Advance must be nonnegative');
    const target = this.current + ms;
    while (true) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      const [id, timer] = due;
      this.timers.delete(id);
      this.current = timer.at;
      timer.callback();
    }
    this.current = target;
  }
}

module.exports = { VirtualClock };
