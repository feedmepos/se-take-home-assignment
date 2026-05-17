import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { KitchenSnapshot } from "./types";
import { KitchenModel } from "./model";

function readProcessMs(): number {
  const raw = process.env.NEXT_PUBLIC_ORDER_PROCESS_MS;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return 10_000;
}

export function useKitchen(): { snapshot: KitchenSnapshot; model: KitchenModel } {
  const processMs = useMemo(() => readProcessMs(), []);
  const model = useMemo(() => new KitchenModel(processMs), [processMs]);

  useEffect(() => {
    return () => {
      model.destroy();
    };
  }, [model]);

  const snapshot = useSyncExternalStore(
    model.subscribe,
    model.getSnapshot,
    model.getServerSnapshot,
  );
  return { snapshot, model };
}
