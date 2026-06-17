# Pattern: Components (`src/components/`, `src/app/`)

Components render snapshots and dispatch commands. **No domain logic** — no
sorting, no timers, no queue decisions. If a component is deciding *what happens*
rather than *how it looks*, the logic is in the wrong layer.

## Client/server boundary

- `app/page.tsx` composes the layout. Keep the `"use client"` boundary as low as
  possible: the interactive board is a client component; static chrome can stay
  server-rendered. This is the meaningful "code splitting" — small client bundle.
- Do not add `dynamic(() => import(...))` to this board. It's too small to
  benefit; lazy-loading it would be cargo-culting. Record the judgment, move on.

## Component contracts

- Presentational and small. Props in, JSX out. Data via the store hooks from
  `state-bridge.md`; never instantiate the controller in a component.
- One component per file, `kebab-case.tsx`, `PascalCase` export.
- Lists keyed by stable domain id (`order.id`, `bot.id`).

```
controls.tsx        4 buttons → orderCommands. Disable "-Bot" when bots.length===0.
pending-column.tsx  reads usePending(); renders OrderCard list, VIP cards visibly distinct.
complete-column.tsx reads useComplete(); each card shows completedAt as HH:MM:SS.
bot-shelf.tsx       reads useBots(); IDLE vs PROCESSING; processing bot hosts a Countdown.
order-card.tsx      pure presentational: order #, VIP/NORMAL badge, status.
countdown.tsx       see below — the only ticking component.
```

## Countdown isolation (performance-critical)

The live 10→0 countdown must not re-render the board. Push ticking to a leaf:

```tsx
// countdown.tsx
export function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);          // always clean up
  }, []);
  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return <span>{secondsLeft}s</span>;
}
```

Only this component re-renders on each tick; columns re-render solely on real
state transitions.

## Accessibility & polish

- Buttons are real `<button>`s with discernible labels; disabled state reflected
  in the DOM, not just styling.
- Status conveyed by text/badge, not colour alone.
- Empty states: PENDING and COMPLETE read clearly when empty ("No orders yet").
- Keep markup semantic; columns are `<section>` with headings.
