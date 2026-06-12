---
name: mcdonalds-order-controller-vue
description: Build, modify, or review a Vue frontend prototype for a McDonald's-style cooking robot order controller. Use when the task involves normal and VIP order creation, pending and completed order queues, adding/removing cooking bots, 10-second per-order processing, in-memory queue control, or validating the behavior described in a Chinese requirements file named 需求.txt in the current directory.
---

# McDonald's Order Controller Vue

Use this skill to implement or review the Vue frontend prototype described by `需求.txt` in the current working directory. Keep all generated project files, scripts, assets, and documentation inside the current directory.

## Core Goal

Create a modern, easy-to-use Vue frontend that controls an in-memory order flow:

- Normal customers create normal orders.
- VIP customers create VIP orders.
- VIP orders are processed before all normal orders.
- Cooking bots process one order at a time.
- Each order takes exactly 10 seconds to complete.
- Completed orders move from `PENDING` to `COMPLETE`.
- No backend or persistence is required.

## Required User Actions

Provide visible controls for:

- `New Normal Order`
- `New VIP Order`
- `+ Bot`
- `- Bot`

The first screen must be the working app, not a landing page.

## State Model

Use a small explicit state model. At minimum track:

- `nextOrderId`: monotonically increasing integer.
- `pendingOrders`: ordered array of waiting orders.
- `completedOrders`: ordered array of completed orders.
- `bots`: ordered array of active bots.
- `nextBotId`: monotonically increasing integer.

Represent each order with fields equivalent to:

```ts
type OrderType = 'VIP' | 'NORMAL'
type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

interface Order {
  id: number
  type: OrderType
  status: OrderStatus
  createdAt: number
}
```

Represent each bot with fields equivalent to:

```ts
type BotStatus = 'IDLE' | 'PROCESSING'

interface Bot {
  id: number
  status: BotStatus
  currentOrder: Order | null
  timerId: number | null
  startedAt: number | null
}
```

Adapt the exact syntax to the project style. If TypeScript is already present, use it. If the project is plain JavaScript, keep the same structure with clear object fields.

## Queue Rules

Implement queue ordering deterministically:

- A normal order is appended after all existing pending orders.
- A VIP order is inserted after the last existing pending VIP order and before the first pending normal order.
- Order IDs must be unique and strictly increasing.
- Pending display order must exactly match processing order.

Use one canonical insertion helper, for example `insertPendingOrder(order)`, so new VIP orders and returned interrupted orders follow the same priority rules.

For stable ordering, sort pending orders by:

1. Priority: `VIP` before `NORMAL`.
2. Order ID ascending within the same priority.

This preserves VIP priority and keeps interrupted orders close to their original queue position relative to orders of the same type.

## Bot Scheduling Rules

Create one scheduling function, for example `scheduleBots()`, and call it after every state change that can create work:

- After creating an order.
- After adding a bot.
- After a bot completes an order.
- After removing a bot and returning its current order.

Scheduling behavior:

- An idle bot immediately claims the first order in `pendingOrders`.
- Claiming removes the order from `pendingOrders`.
- The claimed order becomes `PROCESSING` and is stored on the bot as `currentOrder`.
- The bot becomes `PROCESSING`.
- Start a 10-second timer for that bot.
- When the timer fires, move the order to `completedOrders`, clear the bot's current order, mark the bot `IDLE`, then call `scheduleBots()` again.
- If there is no pending order, the bot remains `IDLE`.

Never allow a bot to process more than one order at a time.

## Adding Bots

When `+ Bot` is clicked:

- Create a new bot with a unique increasing bot ID.
- Add it to the active bot list.
- Immediately call `scheduleBots()`.

If pending orders exist, the new bot should start processing one immediately.

## Removing Bots

When `- Bot` is clicked:

- Remove the latest bot, meaning the active bot with the highest ID / most recent creation position.
- If no bots exist, do nothing or show a disabled control.
- If the removed bot is idle, simply remove it.
- If the removed bot is processing an order:
  - Clear its active timer.
  - Change the order back to `PENDING`.
  - Return the order to `pendingOrders` using the canonical priority insertion/sort helper.
  - Remove the bot.
  - Call `scheduleBots()` so remaining bots can claim work if available.

This cancelled order must not move to `COMPLETE`.

## Timer Integrity

Prevent stale timers:

- Store each bot's timer ID.
- Clear the timer when a processing bot is removed.
- In a timer callback, confirm the bot still exists and still owns the same order before completing it.
- On component unmount, clear all active timers.

Use real timers for the prototype. Keep the duration configurable through a constant such as `PROCESSING_MS = 10000` so tests or demos can adjust it if needed.

## UI Expectations

Build a modern operational interface with dense, clear information:

- A top command area for creating orders and changing bot count.
- A `PENDING` area showing waiting orders in exact queue order.
- A `COMPLETE` area showing finished orders.
- A bot area showing every active bot, its status, and current order if processing.
- Counts for pending, completed, active bots, idle bots, and processing bots.
- Clear visual distinction between VIP and normal orders.
- Clear visual distinction between idle and processing bots.
- Responsive layout that works on mobile and desktop.

Avoid explanatory marketing copy. The app should look like a control panel for repeated use.

## Implementation Workflow

1. Read `需求.txt` with UTF-8 encoding if Chinese text appears garbled.
2. Inspect the current directory before creating files.
3. If a Vue project already exists, follow its existing structure and style.
4. If no project exists, create a Vite Vue app directly in the current directory.
5. Keep all generated files in the current directory.
6. Implement queue logic separately from presentation where practical, either in a composable or in clearly named functions inside the main component.
7. Keep behavior deterministic and easy to inspect.
8. Run the project build before finishing.

Prefer Vue 3 Composition API for a new project. Use plain CSS or the project's existing styling approach unless the user asks for a component library.

## Suggested Manual Acceptance Tests

Verify these scenarios before finalizing:

- Click `New Normal Order` three times. Pending shows orders `1, 2, 3`.
- Click `New VIP Order` after normal orders exist. The VIP order appears before the normal orders.
- Click `New VIP Order` twice. VIP orders remain in ID order before normal orders.
- Add one bot with pending orders. It immediately processes the first pending order.
- After 10 seconds, the processed order appears in `COMPLETE`, and the bot takes the next pending order if one exists.
- Add multiple bots. Each bot processes at most one order, and pending orders are distributed in queue order.
- Remove an idle latest bot. It disappears without changing orders.
- Remove a latest bot that is processing. Its timer stops, its order returns to `PENDING`, and it does not complete later from a stale timer.
- Remove a processing bot while other bots exist. Remaining bots continue processing normally.
- With no pending orders, bots show `IDLE`; when a new order is created, an idle bot starts immediately.

## Build And Verification

For a Vite project, run:

```bash
npm install
npm run build
```

If tests are available, run the relevant test command as well. If no automated tests exist, report the manual scenarios verified and any scenario not checked.

## Common Pitfalls

- Do not append VIP orders after normal orders.
- Do not let removed bots complete orders through stale timers.
- Do not reset order IDs after orders complete.
- Do not persist data to local storage or a backend unless explicitly requested.
- Do not remove the oldest bot when `- Bot` is clicked; remove the latest bot.
- Do not create a landing page; build the working control panel as the main screen.
