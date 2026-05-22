# Architecture

**Analysis Date:** 2026-01-21

## Pattern Overview

**Overall:** Pre-implementation Planning Phase

**Key Characteristics:**
- Planning documents define two potential implementation tracks
- Frontend track: Full-stack web application with PWA/offline capabilities
- Backend track: CLI application for GitHub Actions execution
- No actual implementation code exists yet

## Layers

Not applicable - code is in planning phase only.

Per `PLAN.md`, the planned frontend architecture includes:

**Frontend (Planned):**
- **Frontend Layer:** React + Tailwind CSS (TanStack Start)
  - UI components (PENDING/PROCESSING/COMPLETE order areas)
  - Control buttons (New Normal/VIP Order, +Bot/-Bot)
  - Bot display with status indicators
- **API Layer:** TanStack Start file-based routing
  - CRUD endpoints for orders and bots
  - Authentication endpoints
  - Sync endpoint for offline operations
- **Offline Layer:** IndexedDB (Dexie.js)
  - Local-first storage
  - Sync queue with exponential backoff
  - BroadcastChannel for multi-tab coordination
- **Data Layer:** Drizzle ORM
  - Schema definitions (users, orders, bots)
  - Queries with SQLite dialect
- **Database Layer:** Turso (LibSQL)
  - Cloud-hosted SQLite database

**Backend (Planned):**
- CLI application executing in memory
- Order queue management
- Bot processing simulation
- Output to `scripts/result.txt` with timestamps

## Data Flow

**Not implemented yet.**

Planned frontend data flow (per `PLAN.md`):

1. **User creates order:**
   - UI writes to IndexedDB immediately (optimistic update)
   - Operation queued for sync
   - Background sync to Turso when online

2. **Bot processing:**
   - Client-side timer (10 seconds per order)
   - Auto-assign next order from PENDING (VIP first, then by order_number)
   - Update status in local IndexedDB
   - Sync progress to server

3. **Read path:**
   - UI reads from IndexedDB (fast, always available)
   - TanStack Query manages server state cache
   - Periodic background sync from Turso

## Key Abstractions

**Planned (per `PLAN.md`):**

**Order:**
- Represents a customer order (NORMAL or VIP)
- States: PENDING → PROCESSING → COMPLETE
- Properties: order_number (unique, incrementing), type, status, user_id, bot_id

**Bot:**
- Represents a cooking bot
- States: IDLE or PROCESSING
- Processes one order at a time (10 second duration)
- Created/removed by MANAGER role

**User:**
- Represents system users
- Roles: NORMAL, VIP, MANAGER, BOT
- Sample users to be seeded

**SyncOperation:**
- Represents pending sync operations
- Types: CREATE, UPDATE, DELETE
- Entities: user, order, bot

## Entry Points

**Not implemented yet.**

Planned entry points (per `PLAN.md`):

**Frontend:**
- `app/routes/index.tsx` - Main order management UI
- `app/routes/login.tsx` - Login page
- API routes in `app/api/` - CRUD endpoints

**Backend:**
- CLI entry point (Go or Node.js)
- Output to `scripts/result.txt`

**Current/Placeholder:**
- `scripts/run.sh` - Run script (placeholder)
- `scripts/build.sh` - Build script (placeholder)
- `scripts/test.sh` - Test script (placeholder)

## Error Handling

**Not implemented yet.**

Planned approaches (per `PLAN.md`):
- Sync failures: Exponential backoff retry
- Offline handling: Graceful degradation, local operations continue
- Conflict resolution: Last-write-wins strategy

## Cross-Cutting Concerns

**Offline/Online Detection:**
- Network status API for connectivity
- UI indicators for sync status

**Authentication:**
- Sample users with roles (NORMAL, VIP, MANAGER, BOT)
- Role-based UI permissions

**UUID7 Primary Keys:**
- All tables use UUID7 for time-ordered, conflict-resistant IDs

**Soft Delete:**
- `deleted_at` timestamp instead of actual DELETE
- Preserves audit trail and allows recovery

---

*Architecture analysis: 2026-01-21*
*Update when implementation begins*
