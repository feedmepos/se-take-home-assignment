# Pattern: State Bridge (`src/store/`)

Connects the pure core to React without leaking React into the core, and without
re-rendering more than necessary. **Performance lives here.**

## Bridge with `useSyncExternalStore`

One controller instance, module-scoped. Components subscribe via a hook. This is
tear-free, zero-dependency, and keeps the controller as the single source of truth.

```ts
// use-order-controller.ts
import { useSyncExternalStore } from "react";
import { OrderController } from "@/core/order-controller";

const controller = new OrderController();

export function useOrderControllerSnapshot() {
  return useSyncExternalStore(
    controller.subscribe.bind(controller),
    controller.getSnapshot.bind(controller),
  );
}

// commands are stable references — safe to pass to memoized children
export const orderCommands = {
  newNormal: () => controller.addNormalOrder(),
  newVip: () => controller.addVipOrder(),
  addBot: () => controller.addBot(),
  removeBot: () => controller.removeBot(),
} as const;
```

> Requires the stable-snapshot contract from `core-domain.md`. If `getSnapshot()`
> returns a new object each call, this hook loops.

## Performance rules

- **Subscribe to slices, not the world.** Provide selector hooks so a column only
  re-renders when *its* slice changes:
  ```ts
  export const usePending = () =>
    useSyncExternalStore(sub, () => controller.getSnapshot().pending);
  ```
  Pair with the stable-reference guarantee so unchanged slices skip renders.
- **Never tick the board.** The 10s countdown must not re-render PENDING/COMPLETE
  every frame. The countdown owns its own interval in the leaf component
  (`countdown.tsx`) and reads `processingEndsAt` from props — see
  `components.md`. The board only re-renders on real state transitions.
- **Derive, don't duplicate.** No copies of core state in React state. Anything
  derivable (counts, remaining seconds) is computed at the edge.
- **Stable callbacks.** Commands are module constants, so memoized children don't
  re-render from new function identities.
- Keys are the stable, unique `order.id` / `bot.id` — never array index.

## Where Zustand fits (and where it doesn't)

Default to `useSyncExternalStore` — it's enough and adds nothing to the bundle.
Reach for Zustand only if UI-only ephemeral state appears that doesn't belong in
the domain (e.g. a "selected order" highlight). Domain state never moves into
Zustand. If you add it, note why in `PROGRESS.md`.
