# Pattern: Styling (Tailwind v4 + shadcn/ui)

Clean, legible, consistent. The board should read at a glance in a live demo:
where's PENDING, where's COMPLETE, which orders are VIP, which bots are busy.

## Rules

- Tailwind utilities in markup; **no inline `style`** and no magic hex in JSX.
- Centralise design tokens (colours, spacing, radii) in the Tailwind v4 theme /
  CSS variables. Reference tokens, not raw values, so the palette changes in one
  place.
- Use shadcn/ui primitives (Button, Card, Badge) rather than hand-rolling.
  Compose; don't fork their internals.
- `cn()` helper for conditional classes — no string concatenation soup.
- Keep a small, deliberate palette. A warm, clean light-mode-first look is fine
  (consistent with the ekalazim.com aesthetic) but don't spend the hour here.

## Semantic intent, not decoration

- VIP vs NORMAL distinguished by a labelled badge **and** an accent — never
  colour alone (accessibility).
- Bot state (IDLE / PROCESSING) is visually obvious and text-labelled.
- The two columns are visually balanced and equally weighted; the eye should
  track an order moving left→right.

## Don't

- No animation library for the MVP. A CSS transition on card
  enter/move is plenty; reach for more only if time remains.
- No responsive gymnastics — desktop demo first; a sane mobile stack is a bonus,
  not a requirement.
