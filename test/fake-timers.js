'use strict';

/**
 * Deterministic stand-in for setTimeout/clearTimeout so the suite can exercise
 * 10-second cooking times without actually waiting for them.
 */
class FakeTimers {
  #now = 0;
  #nextId = 1;
  #tasks = new Map();

  setTimeout(fn, ms) {
    const id = this.#nextId++;
    this.#tasks.set(id, { fn, at: this.#now + ms });
    return id;
  }

  clearTimeout(id) {
    this.#tasks.delete(id);
  }

  get scheduledCount() {
    return this.#tasks.size;
  }

  /** Runs every callback due within `ms`, including ones scheduled along the way. */
  advance(ms) {
    const target = this.#now + ms;
    for (;;) {
      const due = [...this.#tasks.entries()]
        .filter(([, task]) => task.at <= target)
        .sort(([idA, a], [idB, b]) => a.at - b.at || idA - idB)[0];
      if (!due) {
        break;
      }

      const [id, task] = due;
      this.#now = task.at;
      this.#tasks.delete(id);
      task.fn();
    }
    this.#now = target;
  }
}

module.exports = { FakeTimers };
