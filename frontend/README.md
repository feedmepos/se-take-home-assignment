# McDonald's Order Controller Frontend

A premium Next.js dashboard for managing automated cooking bots and customer orders.

## Features

- **Real-time Dashboard**: Live system status updates using polling (prepared for WebSockets).
- **Workforce Management**: Scale cooking bots up or down with instant feedback.
- **Order Placement**: Simple interface for placing Normal and VIP orders.
- **System Action Log**: Real-time terminal-style log of all system activities.
- **Tailwind CSS**: Beautiful, responsive UI with a curated color palette.
- **Lucide Icons**: High-quality vector icons for better UX.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Testing**: Jest & React Testing Library
- **State Management**: React Hooks

## Directory Structure

- `src/app`: Page components and layouts.
- `src/components`: Reusable UI components.
- `src/services`: API client and interface definitions.
- `src/hooks`: Custom hooks for data fetching and real-time updates.
- `__tests__`: Unit tests for components and pages.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Integration

The frontend connects to the Go backend via a REST API. The base URL is configured in `src/services/api.ts` and can be overridden with the `NEXT_PUBLIC_API_URL` environment variable.

### System Status API
A new endpoint was added to the backend to support the "System Status" view:
- `GET /api/v1/system/status`: Returns active bots, order counts, and last 10 actions.

## WebSocket Preparation

The system is designed to transition to WebSockets easily. The `useRealtimeStatus` hook contains a placeholder structure for WebSocket connection, currently using polling for compatibility with the current backend.

## Testing

Run tests with:
```bash
npm test
```
