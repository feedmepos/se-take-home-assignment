"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";

const COOK_TIME_MS = 10_000;

type OrderKind = "Normal" | "VIP";

type Order = {
  id: number;
  kind: OrderKind;
};

type CookingJob = {
  order: Order;
  startedAt: number;
};

type Robot = {
  id: number;
  job: CookingJob | null;
};

type KitchenState = {
  nextOrderId: number;
  nextRobotId: number;
  pending: Order[];
  completed: Order[];
  robots: Robot[];
};

type KitchenAction =
  | { type: "create_order"; kind: OrderKind }
  | { type: "add_robot" }
  | { type: "remove_latest_robot" }
  | { type: "assign_orders"; startedAt: number }
  | { type: "complete_order"; robotId: number; orderId: number };

type TimerEntry = {
  orderId: number;
  timerId: number;
};

const initialState: KitchenState = {
  nextOrderId: 1,
  nextRobotId: 1,
  pending: [],
  completed: [],
  robots: [],
};

function orderPriority(kind: OrderKind) {
  return kind === "VIP" ? 0 : 1;
}

function compareOrders(first: Order, second: Order) {
  return (
    orderPriority(first.kind) - orderPriority(second.kind) ||
    first.id - second.id
  );
}

function insertPendingOrder(pending: Order[], order: Order) {
  return [...pending, order].sort(compareOrders);
}

function assignPendingOrders(state: KitchenState, startedAt: number): KitchenState {
  if (state.pending.length === 0) {
    return state;
  }

  let remainingPending = state.pending;
  let hasAssignment = false;

  const robots = state.robots.map((robot) => {
    if (robot.job !== null || remainingPending.length === 0) {
      return robot;
    }

    const [nextOrder, ...rest] = remainingPending;
    remainingPending = rest;
    hasAssignment = true;

    return {
      ...robot,
      job: {
        order: nextOrder,
        startedAt,
      },
    };
  });

  if (!hasAssignment) {
    return state;
  }

  return {
    ...state,
    pending: remainingPending,
    robots,
  };
}

function kitchenReducer(
  state: KitchenState,
  action: KitchenAction,
): KitchenState {
  switch (action.type) {
    case "create_order": {
      const order: Order = {
        id: state.nextOrderId,
        kind: action.kind,
      };

      return {
        ...state,
        nextOrderId: state.nextOrderId + 1,
        pending: insertPendingOrder(state.pending, order),
      };
    }

    case "add_robot":
      return {
        ...state,
        nextRobotId: state.nextRobotId + 1,
        robots: [
          ...state.robots,
          {
            id: state.nextRobotId,
            job: null,
          },
        ],
      };

    case "remove_latest_robot": {
      const latestRobot = state.robots.at(-1);

      if (!latestRobot) {
        return state;
      }

      const robots = state.robots.slice(0, -1);
      const pending =
        latestRobot.job === null
          ? state.pending
          : insertPendingOrder(state.pending, latestRobot.job.order);

      return {
        ...state,
        pending,
        robots,
      };
    }

    case "assign_orders":
      return assignPendingOrders(state, action.startedAt);

    case "complete_order": {
      const robot = state.robots.find((item) => item.id === action.robotId);

      if (robot?.job?.order.id !== action.orderId) {
        return state;
      }

      return {
        ...state,
        completed: [...state.completed, robot.job.order],
        robots: state.robots.map((item) =>
          item.id === action.robotId ? { ...item, job: null } : item,
        ),
      };
    }

    default:
      return state;
  }
}

function getOrderTone(kind: OrderKind) {
  return kind === "VIP"
    ? "border-[#c08a00] bg-[#fff7d6] text-[#5f4300]"
    : "border-slate-200 bg-white text-slate-700";
}

function OrderRow({ order }: { order: Order }) {
  return (
    <li
      className={`flex min-h-16 items-center justify-between rounded-md border px-4 py-3 shadow-sm ${getOrderTone(
        order.kind,
      )}`}
    >
      <div>
        <p className="text-sm font-semibold text-slate-950">Order #{order.id}</p>
        <p className="mt-1 text-xs font-medium uppercase text-slate-500">
          {order.kind}
        </p>
      </div>
      <span className="rounded border border-current px-2 py-1 text-xs font-semibold">
        {order.kind === "VIP" ? "Priority" : "Standard"}
      </span>
    </li>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
      {label}
    </div>
  );
}

function OrderList({
  orders,
  emptyLabel,
}: {
  orders: Order[];
  emptyLabel: string;
}) {
  if (orders.length === 0) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <ul className="grid gap-3" aria-live="polite">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </ul>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export default function OrderController() {
  const [state, dispatch] = useReducer(kitchenReducer, initialState);
  const [now, setNow] = useState(() => Date.now());
  const timersRef = useRef<Map<number, TimerEntry>>(new Map());

  const activeRobots = useMemo(
    () => state.robots.filter((robot) => robot.job !== null),
    [state.robots],
  );
  const idleRobotCount = state.robots.length - activeRobots.length;

  useEffect(() => {
    if (
      state.pending.length > 0 &&
      state.robots.some((robot) => robot.job === null)
    ) {
      dispatch({ type: "assign_orders", startedAt: Date.now() });
    }
  }, [state.pending.length, state.robots]);

  useEffect(() => {
    if (activeRobots.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 250);

    return () => window.clearInterval(intervalId);
  }, [activeRobots.length]);

  useEffect(() => {
    const activeRobotIds = new Set<number>();

    state.robots.forEach((robot) => {
      const job = robot.job;

      if (!job) {
        return;
      }

      activeRobotIds.add(robot.id);

      const existingTimer = timersRef.current.get(robot.id);
      if (existingTimer?.orderId === job.order.id) {
        return;
      }

      if (existingTimer) {
        window.clearTimeout(existingTimer.timerId);
      }

      const delay = Math.max(
        0,
        job.startedAt + COOK_TIME_MS - Date.now(),
      );
      const timerId = window.setTimeout(() => {
        timersRef.current.delete(robot.id);
        dispatch({
          type: "complete_order",
          robotId: robot.id,
          orderId: job.order.id,
        });
      }, delay);

      timersRef.current.set(robot.id, {
        orderId: job.order.id,
        timerId,
      });
    });

    timersRef.current.forEach((entry, robotId) => {
      if (!activeRobotIds.has(robotId)) {
        window.clearTimeout(entry.timerId);
        timersRef.current.delete(robotId);
      }
    });
  }, [state.robots]);

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      timers.forEach((entry) => window.clearTimeout(entry.timerId));
      timers.clear();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#d71920] text-2xl font-black text-[#ffc72c] shadow-sm">
              M
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-slate-500">
                Automated Kitchen
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                Order Controller
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:min-w-[360px]">
            <StatTile label="Pending" value={state.pending.length} />
            <StatTile label="Cooking" value={activeRobots.length} />
            <StatTile label="Done" value={state.completed.length} />
          </div>
        </header>

        <section className="grid flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)_minmax(0,1fr)]">
          <aside className="flex flex-col gap-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-950">Controls</h2>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: "create_order", kind: "Normal" })
                  }
                  className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  New Normal Order
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "create_order", kind: "VIP" })}
                  className="min-h-11 rounded-md border border-[#c08a00] bg-[#ffc72c] px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-[#ffd95c] focus:outline-none focus:ring-2 focus:ring-[#c08a00]"
                >
                  New VIP Order
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "add_robot" })}
                    className="min-h-11 rounded-md bg-[#1f7a4d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#17633d] focus:outline-none focus:ring-2 focus:ring-[#62b58d]"
                  >
                    + Bot
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "remove_latest_robot" })}
                    disabled={state.robots.length === 0}
                    className="min-h-11 rounded-md border border-[#d71920] px-4 py-2 text-sm font-semibold text-[#b31319] transition-colors hover:bg-[#fff0f1] focus:outline-none focus:ring-2 focus:ring-[#e66b70] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
                  >
                    - Bot
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-950">Bots</h2>
                <span className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
                  {state.robots.length} total
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {state.robots.length === 0 ? (
                  <EmptyState label="No bots available" />
                ) : (
                  state.robots.map((robot) => {
                    const elapsed = robot.job
                      ? Math.min(COOK_TIME_MS, now - robot.job.startedAt)
                      : 0;
                    const progress = Math.round(
                      (elapsed / COOK_TIME_MS) * 100,
                    );
                    const secondsLeft = robot.job
                      ? Math.max(0, Math.ceil((COOK_TIME_MS - elapsed) / 1000))
                      : 0;

                    return (
                      <article
                        key={robot.id}
                        className="min-h-28 rounded-md border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-slate-950">
                            Bot #{robot.id}
                          </p>
                          <span
                            className={`rounded border px-2 py-1 text-xs font-semibold ${
                              robot.job
                                ? "border-[#1f7a4d] bg-[#e6f6ed] text-[#145536]"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                          >
                            {robot.job ? "Cooking" : "Idle"}
                          </span>
                        </div>

                        {robot.job ? (
                          <div className="mt-4">
                            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                              <span>Order #{robot.job.order.id}</span>
                              <span>{secondsLeft}s left</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
                              <div
                                className="h-full bg-[#1f7a4d] transition-[width] duration-200"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm font-medium text-slate-500">
                            Waiting for orders
                          </p>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
              {state.robots.length > 0 ? (
                <p className="mt-4 text-sm font-medium text-slate-500">
                  {idleRobotCount} idle, {activeRobots.length} cooking
                </p>
              ) : null}
            </div>
          </aside>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  PENDING
                </h2>
              </div>
              <span className="rounded border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
                {state.pending.length}
              </span>
            </div>
            <div className="mt-4">
              <OrderList
                orders={state.pending}
                emptyLabel="No pending orders"
              />
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  COMPLETE
                </h2>
              </div>
              <span className="rounded border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
                {state.completed.length}
              </span>
            </div>
            <div className="mt-4">
              <OrderList
                orders={state.completed}
                emptyLabel="No completed orders"
              />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
