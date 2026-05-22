# FeedMe Order Controller

A full-stack order management system built with TanStack Start, featuring VIP priority queuing, bot processing, and offline-first capabilities.

## Features

- **Order Management**: Create and track NORMAL and VIP orders with a three-column dashboard (PENDING → PROCESSING → COMPLETE)
- **VIP Priority**: VIP orders are prioritized in the queue
- **Bot Processing**: Automated bots process orders with 10-second timers
- **User Roles**: NORMAL, VIP, and MANAGER roles with different permissions
- **Offline-First**: IndexedDB storage with automatic sync when connection is restored
- **PWA Ready**: Installable as a progressive web app
- **Multi-Tab Sync**: Single-writer pattern ensures only one tab processes orders

## Tech Stack

- **Framework**: TanStack Start (React 19, Vite 7)
- **Database**: Drizzle ORM with SQLite (local) / Turso (production)
- **State Management**: TanStack Store
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Offline Storage**: Dexie (IndexedDB wrapper)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Database Setup

For local development, the app uses SQLite. Run the seed script to create the database and demo users:

```bash
pnpm tsx scripts/seed-db.ts
```

This creates:
- 3 demo users: `normal_user`, `vip_user`, `manager` (password: `password123`)

### Development

```bash
pnpm dev
```

Visit `http://localhost:3000`

## Demo Credentials

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| normal_user | password123 | NORMAL | Create normal orders |
| vip_user | password123 | VIP | Create normal + VIP orders |
| manager | password123 | MANAGER | All orders + bot management |

## Architecture

### Database Schema

```sql
-- Users table with soft delete
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- UUID7
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'NORMAL' | 'VIP' | 'MANAGER' | 'BOT'
  created_at INTEGER,
  updated_at INTEGER,
  deleted_at INTEGER  -- Soft delete support
);

-- Orders table with soft delete and FK cascades
CREATE TABLE orders (
  id TEXT PRIMARY KEY,  -- UUID7
  order_number INTEGER NOT NULL,
  type TEXT NOT NULL,  -- 'NORMAL' | 'VIP'
  status TEXT NOT NULL,  -- 'PENDING' | 'PROCESSING' | 'COMPLETE'
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  bot_id TEXT REFERENCES bots(id) ON DELETE SET NULL,
  created_at INTEGER,
  completed_at INTEGER,
  updated_at INTEGER,
  deleted_at INTEGER
);

-- Bots table with soft delete
CREATE TABLE bots (
  id TEXT PRIMARY KEY,  -- UUID7
  status TEXT NOT NULL,  -- 'IDLE' | 'PROCESSING'
  current_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at INTEGER,
  updated_at INTEGER,
  deleted_at INTEGER
);
```

### Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard with 3-column layout
│   ├── OrderCard.tsx    # Order display with VIP styling
│   ├── BotDisplay.tsx   # Bot status with progress bar
│   ├── ControlPanel.tsx # Control buttons
│   ├── LoginForm.tsx    # Login page
│   └── OfflineIndicator.tsx  # Sync status
├── db/
│   ├── schema.ts        # Drizzle schema definitions
│   ├── index.ts         # Database connection (SQLite/Turso)
│   └── offline.ts       # IndexedDB wrapper (Dexie)
├── lib/
│   ├── bot-processor.ts # Bot processing singleton
│   ├── sync-manager.ts  # Offline-to-online sync
│   ├── uuid7.ts         # UUID7 generator
│   └── schemas/         # Zod validation schemas
├── routes/
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Dashboard route
│   ├── login.tsx        # Login route
│   └── api/             # API routes
├── store/
│   ├── auth.ts          # Authentication state
│   └── bot.ts           # Bot timer state
└── styles.css           # Tailwind + custom styles
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User authentication |
| GET | `/api/orders` | List all orders |
| POST | `/api/orders` | Create new order |
| PATCH | `/api/orders/:id` | Update order status |
| DELETE | `/api/orders/:id` | Soft delete order |
| GET | `/api/bots` | List all bots |
| POST | `/api/bots` | Create new bot |
| PATCH | `/api/bots/:id` | Update bot status |
| DELETE | `/api/bots/:id` | Soft delete bot |
| POST | `/api/sync` | Client-server sync |

## Testing

Run the automated test suite:

```bash
python3 /tmp/final_test.py
```

### Manual Test Checklist

- [x] Login with demo credentials
- [x] Create NORMAL orders
- [x] Create VIP orders (gold badge displayed)
- [x] View three-column dashboard (PENDING | PROCESSING | COMPLETE)
- [x] Add/remove bots (MANAGER only)
- [x] Auto-assign orders to idle bots
- [x] 10-second processing timer
- [x] Orders move to COMPLETE after timer
- [x] Offline indicator shows when disconnected
- [x] Sync status displays pending operations

## Known Issues

1. **URL Navigation**: URL doesn't update on client-side navigation (TanStack Router issue)
2. **Turso Auth**: Turso credentials need verification for production deployment
3. **Concurrent Bot Processing**: Multiple bots can process orders simultaneously, but the auto-assign logic needs refinement for optimal distribution

## Deployment

### Build for Production

```bash
pnpm build
```

### Deploy to Vercel

1. Set environment variables:
   ```
   TURSO_DATABASE_URL=libsql://your-turso-url
   TURSO_AUTH_TOKEN=your-turso-auth-token
   ```

2. Deploy:
   ```bash
   vercel deploy
   ```

## License

MIT
