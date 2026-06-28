import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addBot,
  addOrder,
  botsView,
  completeOrders,
  createInitialState,
  pendingOrders,
  reconcile,
  removeBot,
} from '../domain/orderSystem';
import type { SystemState } from '../domain/types';

/** How often the system reconciles and the progress bars repaint. */
const TICK_MS = 100;

/**
 * Thin React wrapper around the pure order-system functions. It owns the state,
 * drives a reconcile loop on an interval, and exposes derived view data plus
 * user actions. Every action reconciles immediately so a new order or bot is
 * picked up right away (reqs 1, 3, 4) rather than waiting for the next tick.
 */
export function useOrderSystem(processMs: number) {
  const [state, setState] = useState<SystemState>(createInitialState);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((s) => reconcile(s, t, processMs));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [processMs]);

  const run = useCallback(
    (action: (s: SystemState, now: number) => SystemState) => {
      const t = Date.now();
      setNow(t);
      setState((s) => reconcile(action(s, t), t, processMs));
    },
    [processMs],
  );

  const actions = useMemo(
    () => ({
      newNormalOrder: () => run((s, t) => addOrder(s, 'NORMAL', t)),
      newVipOrder: () => run((s, t) => addOrder(s, 'VIP', t)),
      increaseBot: () => run((s) => addBot(s)),
      decreaseBot: () => run((s) => removeBot(s)),
    }),
    [run],
  );

  const pending = useMemo(() => pendingOrders(state), [state]);
  const complete = useMemo(() => completeOrders(state), [state]);
  const bots = useMemo(() => botsView(state), [state]);

  return {
    now,
    pending,
    complete,
    bots,
    botCount: state.bots.length,
    actions,
  };
}
