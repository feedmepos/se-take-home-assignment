// A deterministic, in-memory scheduler + clock used by the simulation and the
// unit tests. Timers fire only when advance() is called, so nothing waits on
// real wall-clock time.
export function createVirtualClock() {
  let currentMs = 0;
  let nextId = 1;
  const tasks = [];

  const scheduler = {
    schedule(ms, cb) {
      const id = nextId++;
      tasks.push({ id, time: currentMs + ms, cb, active: true });
      return id;
    },
    cancel(id) {
      const task = tasks.find((t) => t.id === id);
      if (task) task.active = false;
    },
  };

  const now = () => currentMs;

  // Advance virtual time by `ms`, firing due timers in chronological order.
  // Re-scans after each timer so cascading work (a completion scheduling the
  // next order) is handled correctly.
  function advance(ms) {
    const target = currentMs + ms;
    for (;;) {
      const due = tasks
        .filter((t) => t.active && t.time <= target)
        .sort((a, b) => a.time - b.time)[0];
      if (!due) break;
      due.active = false;
      currentMs = due.time;
      due.cb();
    }
    currentMs = target;
  }

  return { scheduler, now, advance };
}
