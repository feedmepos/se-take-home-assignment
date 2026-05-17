FeedMe – Frontend Prototype

This folder contains the frontend implementation of the McDonald’s Order Controller take-home assignment.

Built with:

React

TypeScript

Vite

Zustand (state management)

TailwindCSS (styling)

This is a prototype implementation that focuses on correctness, clarity, and fulfilling the assignment requirements without overengineering.

🚀 How to Run Locally
cd frontend
npm install
npm run dev

🏗 How to Build
npm run build

🧠 Implementation Overview
Order Model

Each order has:

id (internal numeric ID)

displayId (N1, V2, etc.)

type (VIP or NORMAL)

status (PENDING → PROCESSING → COMPLETE)

Orders are stored as the single source of truth in the Zustand store.

Queues

Three queues are used:

vipQueue

normalQueue

resumeQueue (for cancelled in-progress orders)

Dispatch priority:

Resume queue

VIP queue

Normal queue

This ensures:

VIP priority is respected.

Cancelled work is not starved.

No order is lost when bots are removed.

Bot Behavior

Each bot can process only one order at a time.

Processing is simulated using setTimeout (10 seconds).

When a bot is removed while processing:

The timeout is cleared.

The order returns to PENDING.

The order is inserted into resumeQueue to be processed next.

A race-condition guard is implemented to prevent “ghost completion” if a bot is removed mid-process.

🧪 Manual Testing Scenarios

Add 1 bot → Add 1 normal order → Order completes after 10 seconds.

Add normal → Add VIP → VIP processes first.

Add multiple bots → Add multiple orders → Concurrent processing.

Remove a busy bot → Order returns to pending → Add bot → Order resumes correctly.

Cancelled normal order should process before newly added VIP order.

🎯 Design Decisions

Zustand was chosen for simplicity and clear state management.

All state updates are immutable to ensure proper UI re-render.

The dispatcher runs automatically after any state change (order added, bot added, bot removed).

The implementation prioritizes readability and correctness over abstraction.

This implementation focuses on meeting the assignment requirements clearly and safely, without introducing unnecessary complexity.
