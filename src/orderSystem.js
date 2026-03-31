export function formatTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export class OrderSystem {
  constructor({ orderDurationMs = 10000, now = () => new Date(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    this.orderDurationMs = orderDurationMs;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;

    this.nextOrderId = 1;
    this.nextRobotId = 1;
    this.nextVipSeq = 1;
    this.nextNormalSeq = 1;

    this.pending = [];
    this.completed = [];
    this.robots = [];
  }

  // -------------------- Order Creation --------------------

  addOrder(type) {
    const t = type.toUpperCase();
    const order = {
      id: this.nextOrderId++,
      type: t,
      status: 'PENDING',
      createdAt: this.now().toISOString(),
      completedAt: null,
      completedAtMs: null,
      vipSeq: t === 'VIP' ? this.nextVipSeq++ : null,
      normalSeq: t === 'NORMAL' ? this.nextNormalSeq++ : null,
      assignedRobotId: null,
      timer: null,
    };

    // -------------------- VIP PREEMPTION --------------------
    if (t === 'VIP') {
      const workingNormalRobot = this.robots.find(
        (r) => r.status === 'WORKING' && r.currentOrder?.type === 'NORMAL'
      );

      if (workingNormalRobot) {
        const prevOrder = workingNormalRobot.currentOrder;

        // cancel timer
        if (workingNormalRobot.timer) {
          this.clearTimer(workingNormalRobot.timer);
          workingNormalRobot.timer = null;
        }

        // rollback previous NORMAL
        prevOrder.status = 'PENDING';
        prevOrder.assignedRobotId = null;
        prevOrder.timer = null;

        this.pending.push(prevOrder);
        this.#sortPending();

        // assign VIP to this robot
        workingNormalRobot.status = 'IDLE';
        workingNormalRobot.currentOrder = null;
        workingNormalRobot.currentOrderId = null;

        this.#startProcessing(workingNormalRobot, order);

        // ❗ IMPORTANT: DO NOT DISPATCH HERE
        return order;
      }
    }

    // normal case: insert into pending and dispatch
    this.pending.push(order);
    this.#sortPending();
    this.#dispatch();
    return order;
  }

  // -------------------- Robot Management --------------------

  addRobot() {
    const robot = {
      id: this.nextRobotId++,
      status: 'IDLE',
      currentOrderId: null,
      currentOrder: null,
      timer: null,
    };
    this.robots.push(robot);
    this.#dispatch();
    return robot;
  }

  removeRobot() {
    const robot = this.robots.pop();
    if (!robot) return null;

    if (robot.timer) {
      this.clearTimer(robot.timer);
      robot.timer = null;
    }

    if (robot.currentOrder) {
      const order = robot.currentOrder;

      order.status = 'PENDING';
      order.assignedRobotId = null;
      order.timer = null;

      this.pending.push(order);
      this.#sortPending();
    }

    return robot;
  }

  // -------------------- Helpers --------------------

  #sortPending() {
    this.pending.sort((a, b) => {
      const ga = a.type === 'VIP' ? 0 : 1;
      const gb = b.type === 'VIP' ? 0 : 1;
      if (ga !== gb) return ga - gb;

      const sa = a.type === 'VIP' ? a.vipSeq : a.normalSeq;
      const sb = b.type === 'VIP' ? b.vipSeq : b.normalSeq;
      return sa - sb;
    });
  }

  #dispatch() {
    for (const robot of this.robots) {
      if (robot.status === 'IDLE' && this.pending.length > 0) {
        const next = this.pending.shift();
        this.#startProcessing(robot, next);
      }
    }
  }

  #startProcessing(robot, order) {
    robot.status = 'WORKING';
    robot.currentOrder = order;
    robot.currentOrderId = order.id;

    order.status = 'PROCESSING';
    order.assignedRobotId = robot.id;

    robot.timer = this.setTimer(() => {
      if (robot.currentOrderId !== order.id) return;

      robot.status = 'IDLE';
      robot.currentOrder = null;
      robot.currentOrderId = null;
      robot.timer = null;

      order.status = 'DONE';
      const done = this.now();
      order.completedAt = formatTime(done);
      order.completedAtMs = done.getTime();
      order.assignedRobotId = null;

      this.completed.push(order);
      this.#dispatch();
    }, this.orderDurationMs);
  }

  // -------------------- Public API --------------------

  listPending() {
    return this.pending.map((o) => ({
      id: o.id,
      type: o.type,
      status: o.status,
      completedAt: o.completedAt,
      assignedRobotId: o.assignedRobotId,
    }));
  }

  listCompleted() {
    return this.completed.map((o) => ({
      id: o.id,
      type: o.type,
      status: o.status,
      completedAt: o.completedAt,
      assignedRobotId: o.assignedRobotId,
    }));
  }

  getSnapshot() {
    return {
      pending: this.listPending(),
      completed: this.listCompleted(),
      robots: this.robots.map((r) => ({
        id: r.id,
        status: r.status,
        currentOrderId: r.currentOrderId,
      })),
    };
  }

  // -------------------- renderState (for CLI & demo.js) --------------------

  renderState() {
    const pending = this.pending.length
      ? this.pending.map((o) => `#${o.id} ${o.type}(${o.status})`).join(', ')
      : '(empty)';

    const completed = this.completed.length
      ? this.completed.map((o) => `#${o.id}@${o.completedAt}`).join(', ')
      : '(empty)';

    const robots = this.robots.length
      ? this.robots.map((r) =>
          `Robot${r.id}:${r.status}${r.currentOrderId ? `->#${r.currentOrderId}` : ''}`
        ).join(', ')
      : '(none)';

    return [
      `PENDING: ${pending}`,
      `COMPLETE: ${completed}`,
      `ROBOTS: ${robots}`,
    ].join('\n');
  }

  // -------------------- writeResult (for result.txt) --------------------

  writeResult() {
    return this.completed
      .slice()
      .sort((a, b) => (a.completedAtMs - b.completedAtMs) || (a.id - b.id))
      .map((o) => `Order ${o.id} completed at ${o.completedAt}`)
      .join('\n');
  }
}
