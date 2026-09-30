'use strict';

// A deterministic clock used by tests and the CI demonstration.
class ManualClock {
  constructor(start = Date.UTC(2026, 0, 1, 12, 0, 0)) {
    this.time = start;
    this.nextId = 1;
    this.timers = new Map();
  }

  now = () => this.time;

  setTimeout = (callback, delay) => {
    const id = this.nextId++;
    this.timers.set(id, { due: this.time + delay, callback });
    return id;
  };

  clearTimeout = (id) => this.timers.delete(id);

  advance(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new RangeError('advance requires nonnegative milliseconds');
    }
    const end = this.time + milliseconds;
    while (true) {
      const next = [...this.timers].sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!next || next[1].due > end) break;
      this.time = next[1].due;
      this.timers.delete(next[0]);
      next[1].callback();
    }
    this.time = end;
  }
}

module.exports = { ManualClock };
