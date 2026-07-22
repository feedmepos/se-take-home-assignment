# McDonald's Automated Cooking Bot System

## Project Introduction
This project is an automated cooking bot order management prototype for McDonald's, built with Next.js, React, and TypeScript. It simulates a restaurant order processing system where orders (Normal or VIP) are handled by a fleet of cooking bots. It implements a priority queue system and dynamically manages bot allocation and processing state. This was developed as part of the FeedMe SE Take-Home Assignment.

## How to Run the Project
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run the development server:**
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application in action.

## File Structure
```
app/
├── components/               # Reusable UI components
│   ├── BotStatusPanel.tsx    # Displays the status of all cooking bots
│   ├── ControlPanel.tsx      # Buttons to add orders and manage bots
│   ├── OrderBoards.tsx       # Displays Pending and Completed orders
│   └── StatsBar.tsx          # Top statistics bar showing active counts
├── hooks/                    # Custom React hooks
│   └── useOrderController.ts # Core business logic and state management
├── globals.css               # Global styles (custom CSS)
├── layout.tsx                # Next.js root layout
├── page.tsx                  # Main dashboard view
└── types.ts                  # TypeScript interfaces and types
```

## Functions and Requirements (How to Use)
- **New Normal Order**: Click the "+ Normal Order" button to add a standard order to the pending queue.
- **New VIP Order**: Click the "+ VIP Order" button. VIP orders bypass all normal orders and are placed behind other existing VIP orders.
- **Add Bot**: Click "+ Add Bot" to add a new cooking bot. If there are pending orders, the bot will immediately pick up the highest priority order and start processing.
- **Remove Bot**: Click "- Remove Bot" to remove the newest bot. If the bot is currently processing an order, that order is safely returned to the pending queue retaining its original priority.
- **Order Processing**: Each order takes exactly 10 seconds to process. The progress is visually indicated on the bot cards. Once completed, the order moves to the "Complete" section, and the bot becomes "Idle", ready to pick up the next order.

## Testing Checklist & Test Cases
To ensure the system works as expected, run through the following manual test cases:

### 1. Order Queueing & Priority
- [ ] Add multiple Normal orders. Verify they queue in order of creation.
- [ ] Add a VIP order. Verify it jumps ahead of all Normal orders.
- [ ] Add multiple VIP orders. Verify they queue behind existing VIP orders but still ahead of Normal orders.

### 2. Bot Processing Lifecycle
- [ ] Add a Bot while orders are pending. Verify it immediately picks up the first order.
- [ ] Observe the Bot's state. Verify it shows "Processing" and the progress updates.
- [ ] Wait 10 seconds. Verify the order moves to the "Complete" list and the Bot status changes to "Idle".
- [ ] Verify an "Idle" bot automatically picks up the next pending order if one exists.

### 3. Bot Management & Edge Cases
- [ ] Remove a Bot that is "Idle". Verify it is removed from the list without affecting orders.
- [ ] Remove a Bot that is currently "Processing" an order. Verify the Bot is removed, and the order is correctly placed back into the Pending queue according to its priority (VIPs ahead of Normals).
- [ ] Rapidly add/remove bots and orders. Verify the application remains stable without state corruption or memory leaks.

## Architecture
The application is built using a modern **Next.js** App Router architecture and relies heavily on React's functional paradigm.
- **Component-Based UI**: The user interface is split into focused components (`ControlPanel`, `OrderBoards`, `BotStatusPanel`) to separate presentation from business logic.
- **Custom Hook (`useOrderController`)**: The core engine of the application. It encapsulates the state of `pendingOrders`, `completeOrders`, and `bots`. It exposes simple, actionable methods (`addOrder`, `addBot`, `removeBot`) to the UI components.
- **State Management**: Uses React's `useState`, `useRef`, `useCallback`, and `useEffect`. `useRef` is uniquely utilized to track `setTimeout` timers to prevent state closure staleness and accurately manage asynchronous bot processing.

## Key Design Decisions
1. **Pure State Transitions**: Helper functions like `assign` and `insertWithPriority` are implemented as pure functions. They take the current state, calculate the next correct state (handling priority sorting and bot assignments), and return a new state object. This ensures predictable state updates and avoids race conditions.
2. **Timer Management via `useRef`**: Timers (`setTimeout`) simulating the 10-second processing time are stored in a `useRef` Map. This prevents memory leaks on re-renders, guarantees that timeouts can be safely cleared if a bot is removed mid-process, and handles React StrictMode's double-mounting lifecycle safely.
3. **Decoupled Visual Ticker**: The visual progress ticker (updating every 500ms) relies on comparing the current `Date.now()` to the `startTime` of the bot. It does not dictate the actual completion logic, which ensures the 10-second completion is exact and reliable, isolated from the UI framerate.
4. **Custom Hook Encapsulation**: Choosing to use a custom hook (`useOrderController`) instead of a heavy global state manager (like Redux) keeps the application lightweight while keeping complex state management organized and tightly coupled to the component tree lifecycle.
