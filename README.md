# 🍔 McDonald's Bot Controller

A React-based order management system that simulates an automated bot-driven order fulfillment service. This application manages customer orders (VIP and Normal) and assigns them intelligently to available bots for processing.

## Project Overview

The McDonald's Bot Controller is a take-home assignment project that demonstrates state management, React hooks, and responsive UI design. It allows users to:

- Create orders for VIP and normal customers
- Manage a fleet of bots that process orders
- Track pending and completed orders in real-time
- Automatically assign orders to idle bots with VIP priority

## Features

### Order Management
- **Create Orders**: Add new orders with customer type (VIP or Normal)
- **VIP Priority**: VIP orders are prioritized and assigned to bots before normal orders
- **Order Tracking**: View pending orders and completed orders in separate panels
- **Auto-assignment**: Orders are automatically assigned to idle bots when created

### Bot Management
- **Add Bots**: Dynamically add new bots to the fleet
- **Remove Bots**: Remove bots from the fleet (in-progress orders return to pending queue)
- **Status Tracking**: Each bot displays its current status (Idle/Busy) and assigned order
- **Auto-completion**: Orders complete automatically after 10 seconds

### Responsive Design
- **Desktop Layout**: Three-column dashboard with Orders, Bots, and Completed panels
- **Mobile Layout**: Floating action button for easy order and bot management on small screens
- **Ant Design Components**: Professional UI with Ant Design library

## Tech Stack

- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.3.1
- **UI Library**: Ant Design 6.3.1
- **Icons**: @ant-design/icons 6.1.0
- **Linting**: ESLint 9.39.1

## Project Structure

```
src/
├── App.jsx                 # Main component with state management
├── main.jsx               # Entry point
├── App.css                # Global styles
├── index.css              # Base styles
├── components/
│   ├── CreateOrderModal.jsx        # Modal for creating orders
│   ├── BotsList.jsx                # Display active bots
│   ├── PendingOrdersList.jsx       # Show pending orders
│   ├── CompletedOrdersList.jsx     # Show completed orders
│   └── MobileFloatingActionButton.jsx # Mobile UI controls
└── utils/
    └── enums.js           # Enum definitions for actions, statuses, customer types
```

## How It Works

### State Management
The app uses React's `useReducer` hook to manage global state including:
- VIP and Normal order counters
- Pending orders queue
- Completed orders list
- Active bots fleet

### Order Processing Flow
1. User creates an order (VIP or Normal)
2. Order receives a unique ID (V-0001 for VIP, N-0001 for Normal)
3. Order is automatically assigned to the first available idle bot
4. Bot begins processing (status changes to Busy)
5. After 10 seconds, the order completes automatically
6. Bot returns to Idle status and processes next pending order
7. Next pending order (VIP preferred) is assigned if available

### Bot Management
- **Adding a Bot**: Creates a new idle bot that immediately processes pending orders if available
- **Removing a Bot**: Removes the most recently added bot; if it was processing an order, that order returns to the pending queue

## Getting Started

### Installation

```bash
npm install
```

### Development

Run the development server with hot module replacement:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Create a production-ready build:

```bash
npm run build
```

### Preview

Preview the production build locally:

```bash
npm run preview
```

### Linting

Check code quality:

```bash
npm run lint
```

## Usage Guide

1. **Add a Bot**: Click "Add Bot" to create a new bot. It will immediately start processing pending orders.
2. **Create an Order**: Click "Add Order" and select the customer type (VIP or Normal).
3. **Monitor Progress**: 
   - Watch the pending orders decrease as bots process them
   - See the completed orders accumulate
   - Check bot status in real-time
4. **Remove Bots**: Click "Remove Bot" to remove the last bot. In-progress orders will rejoin the pending queue.

## Key Components

### App.jsx
Main application component containing:
- State management with `useReducer`
- Order assignment logic with VIP prioritization
- Timer-based auto-completion of orders
- Responsive layout with Ant Design Grid system

### CreateOrderModal.jsx
Modal dialog for creating new orders with customer type selection.

### BotsList.jsx
Displays all active bots with their status and current orders.

### PendingOrdersList.jsx & CompletedOrdersList.jsx
Display queued and completed orders respectively.

### MobileFloatingActionButton.jsx
Mobile-optimized floating action button for order and bot management on small screens.

## Enumerations

- **ECustomerType**: VIP, Normal
- **EBotStatus**: Idle, Busy
- **EActionType**: CREATE_ORDER, ADD_BOT, REMOVE_BOT, COMPLETE_ORDER

## Order ID Format

- VIP Orders: `V-0001`, `V-0002`, etc.
- Normal Orders: `N-0001`, `N-0002`, etc.
