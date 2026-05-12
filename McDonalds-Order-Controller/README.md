# McDonald's Order Controller

A single-page frontend application that simulates an automated order management system for McDonald's. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no dependencies.

---

## 🚀 How to Run

No build steps required. Simply open the file in any modern browser:

```
McDonalds-Order-Controller/index.html
```

> Double-click `index.html`, or right-click → **Open with** → your browser of choice.

---

## 📁 Project Structure

```
McDonalds-Order-Controller/
├── index.html    # HTML skeleton — all UI containers and layout
├── style.css     # All styling, design tokens, animations
└── app.js        # All business logic, state management, rendering
```

### Why separated into 3 files?
Each file has a single, clear responsibility:

| File | Responsibility |
|---|---|
| `index.html` | **Structure** — defines what elements exist on the page |
| `style.css` | **Appearance** — controls how everything looks |
| `app.js` | **Behaviour** — controls what everything does |

---

## ✅ Requirements Checklist

| # | Requirement | Status |
|---|---|---|
| 1 | New Normal Order appears in PENDING area | ✅ |
| 2 | New VIP Order inserts in front of Normal orders, behind existing VIP orders | ✅ |
| 3 | Order numbers are unique and auto-incrementing | ✅ |
| 4 | `+ Bot` creates a bot that processes orders (10s each), then picks up the next | ✅ |
| 5 | Bot becomes IDLE when no pending orders remain | ✅ |
| 6 | `- Bot` destroys the **newest** bot (highest ID); if it was mid-process, its order is returned to PENDING maintaining VIP/Normal priority | ✅ |
| 7 | No data persistence — all state is held in memory | ✅ |

---

## 🏗️ Architecture

### State Management
All application data lives in a single `state` object in memory:

```js
const state = {
  pending:     [],  // Orders waiting to be processed (priority queue)
  complete:    [],  // Orders that have been completed
  bots:        [],  // All active bots and their live status
  nextOrderId: 1,   // Auto-incrementing order ID counter
  nextBotId:   1,   // Auto-incrementing bot ID counter
  totalOrders: 0,
  totalVip:    0,
};
```

### VIP Priority Queue Logic
When a VIP order is submitted, the app scans `state.pending` from left to right to find the **last existing VIP order**, then inserts the new VIP order immediately after it. Normal orders are always appended to the end.

```
Before: [VIP-1, Normal-2, Normal-3]
Add VIP-4 → [VIP-1, VIP-4, Normal-2, Normal-3]
```

### Bot Processing (Dual-Timer Design)
Each bot uses two independent JavaScript timers:

| Timer | Interval | Purpose |
|---|---|---|
| `setInterval` | Every 100ms | Updates the visual progress bar smoothly |
| `setTimeout` | After 10,000ms | Triggers order completion and picks up next order |

This separation keeps the UI responsive without running expensive full re-renders every 100ms.

### Rendering Strategy
- **`render()`** — Full rebuild of all UI sections. Called after any state change (order added, bot added/removed, order completed).
- **`updateBotCard()`** — Lightweight update that only changes a single progress bar's CSS width. Called every 100ms by the progress ticker to avoid performance issues.

---

## 🎨 UI Features

- **Real-time system clock** in the header
- **Live statistics bar** — Total, Pending, Completed, VIP counts, Active Bots
- **Bot fleet panel** — Individual cards per bot showing idle/busy state with animated progress bar; overflows into a collapsible popover pill after 10 bots
- **Dual queue columns** — Pending (gold) and Complete (green) side by side
- **Activity log** — Timestamped event feed (newest on top), capped at 80 entries
- **Hold-to-remove** — Hold the `− Bot` button to rapidly remove multiple idle bots
- **Animations** — Order card slide-in, shimmer effect on processing orders, pulsing indicator on busy bots

---

## 🔑 Key Design Decisions

**Why Vanilla JS over a framework?**
The assignment explicitly recommends keeping it simple and scoped. A single `state` object + a `render()` function replicates the core idea of reactive UI without needing React or Vue.

**Why `const state = {}` instead of separate variables?**
Grouping all mutable data into one object makes it easy to see the "full picture" of the app at any point, and prevents accidental global variable pollution.

**Why `updateBotCard()` instead of calling `render()` every 100ms?**
Calling full `render()` at 100ms intervals would rebuild and replace all DOM nodes 10 times per second, which is wasteful. `updateBotCard()` only changes one CSS property (`width`) on one element, costing almost nothing.
