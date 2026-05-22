# AGENTS.md

## Project Overview

This is a **take-home assignment** for a FeedMe order controller system. The task is to implement a prototype that manages order queues with cooking bots. The assignment allows choosing either a **frontend** or **backend** implementation track.

**Current State:** Monorepo with pnpm workspaces. The `pos/` package contains a TanStack Start frontend application.

### Assignment Requirements

**Core functionality:**

- Orders flow through three states: PENDING → PROCESSING → COMPLETE
- VIP orders queue before normal orders but behind existing VIP orders
- Bots process orders (10 seconds per order)
- Managers can add/remove bots dynamically
- Order numbers are unique and incrementing

**Two implementation tracks:**

1. **Frontend:** Full-stack web app (any framework), publicly deployed
2. **Backend:** CLI app (Go or Node.js), runs in GitHub Actions

See `README.md` for full assignment details and `PLAN.md` for the planned architecture.

---

## Monorepo Structure

This is a **pnpm workspace** monorepo with the following packages:

```
feedme-order-controller/
├── pnpm-workspace.yaml       # Workspace configuration
├── package.json               # Root package.json (scripts proxy to packages)
├── pos/                       # @feedme/pos - TanStack Start frontend app
│   ├── package.json
│   ├── src/
│   │   ├── routes/           # TanStack Start file-based routing
│   │   ├── components/       # React components (shadcn/ui)
│   │   ├── data/             # Data access layer
│   │   ├── db/               # Drizzle schema and database
│   │   ├── hooks/            # React hooks
│   │   ├── integrations/     # External integrations
│   │   ├── lib/              # Utilities
│   │   └── styles.css
│   └── drizzle.config.ts
├── scripts/                   # Backend CLI track scripts
│   ├── test.sh
│   ├── build.sh
│   └── run.sh
└── .github/workflows/         # GitHub Actions CI
    └── backend-verify-result.yaml
```

### Workspace Packages

| Package       | Description         | Tech Stack                                             |
| ------------- | ------------------- | ------------------------------------------------------ |
| `@feedme/pos` | Frontend app (pos/) | TanStack Start, React 19, Tailwind v4, Drizzle, Zod v4 |

---

## Development Commands

All commands should be run from the **root** of the monorepo:

```bash
# Install all dependencies (run from root)
pnpm install

# Frontend development (proxies to pos package)
pnpm dev          # Start dev server on port 3000
pnpm build        # Build for production
pnpm test         # Run tests
pnpm lint         # Lint code
pnpm format       # Format code
pnpm check        # Run lint + format

# Database commands (proxies to pos package)
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio

# Backend CLI (scripts in root)
pnpm backend:test   # Run ./scripts/test.sh
pnpm backend:build  # Run ./scripts/build.sh
pnpm backend:run    # Run ./scripts/run.sh
```

### Working with Individual Packages

To run commands directly in a package:

```bash
pnpm --filter pos <command>     # Run command in pos package
pnpm --filter pos dev           # Example: start pos dev server
```

---

## Tech Stacks

### Frontend Stack (@feedme/pos)

**Framework:**

- TanStack Start 1.132+ (full-stack React framework with SSR)
- React 19.2
- Vite 7.1+
- TypeScript 5.7+

**Styling:**

- Tailwind CSS 4.0+ (latest stable v4 with @tailwindcss/vite plugin)
- shadcn/ui components (Radix UI primitives)
- tw-animate-css for animations
- class-variance-authority, clsx, tailwind-merge

**State Management:**

- @tanstack/react-query 5.66+ (server state)
- @tanstack/react-store 0.8+ (client state)
- @tanstack/react-form 1.0+ (form handling)
- @tanstack/react-router 1.132+ (file-based routing with SSR query)

**Validation:**

- Zod 4.3.5+ (latest v4 for schema validation)

**Database:**

- Drizzle ORM 0.45+
- better-sqlite3 12.5+ (local SQLite - can be migrated to Turso/LibSQL)
- drizzle-kit 0.31.8+ (migrations and studio)

**Authentication:**

- better-auth 1.4.12+

**AI Integration (TanStack AI):**

- @tanstack/ai (latest) - AI SDK
- @tanstack/ai-anthropic, ai-gemini, ai-ollama, ai-openai (providers)
- @tanstack/ai-react (React bindings)
- @tanstack/react-ai-devtools (DevTools)

**Testing:**

- Vitest 3.0.5+
- @testing-library/react 16.2+
- @testing-library/dom 10.4+

**DevTools:**

- @tanstack/react-devtools
- @tanstack/react-query-devtools
- @tanstack/react-router-devtools
- @tanstack/devtools-vite

**Other Utilities:**

- lucide-react (icons)
- @faker-js/faker (fake data generation)
- highlight.js (syntax highlighting)
- streamdown (markdown rendering)

### Backend CLI Track

- Shell scripts in `scripts/` directory
- Output to `scripts/result.txt` with HH:MM:SS timestamps
- Validated by GitHub Actions (`.github/workflows/backend-verify-result.yaml`)

---

## Environment Variables

### Frontend (pos/)

The `pos/.env.local` file contains database credentials:

- Database connection for Drizzle/better-sqlite3

**Do not commit `.env.local`** - it is already in `.gitignore`.

### Root (Backend CLI)

The root `.env` file contains Turso database credentials (if migrating to Turso):

- `TURSO_DATABASE_URL` - Turso connection string
- `TURSO_AUTH_TOKEN` - Turso authentication token

---

## Architecture Notes

### Order Queue Logic

- VIP orders always process before normal orders
- Within same priority, orders process by order_number (ascending)
- Each bot processes one order at a time

### Data Flow (Frontend)

- UI → TanStack Store (client state) → TanStack Query (server state) → API Routes → Drizzle ORM → SQLite/Turso

### Key Design Decisions

- **UUID7** for all primary keys (time-ordered, conflict-resistant for offline sync)
- **Soft delete** via `deleted_at` timestamp (never truly delete records)
- **FK cascades:** User delete → orders preserved (NULL user_id); Bot delete → orders unassigned (NULL bot_id)
- **Partial unique indexes** exclude soft-deleted records

### Database Schema

```sql
users (id, username, password_hash, role, deleted_at)
orders (id, order_number, type, status, user_id, bot_id, deleted_at)
bots (id, status, current_order_id, deleted_at)
```

**Roles:** NORMAL, VIP, MANAGER, BOT

### Backend CLI Behavior

**In-memory simulation** (no database required per assignment):

- Separate queues for VIP and Normal orders
- Bots array with status, current order, timer handle
- All output written to `scripts/result.txt` with `HH:MM:SS` timestamps

**Bot behavior:**

- `+ Bot`: Create bot, immediately attempt to process next pending order
- `- Bot`: Remove newest bot; if processing, return order to PENDING
- After 10 seconds: Move order to COMPLETE, attempt next order
- If no orders: Bot becomes IDLE

---

## Code Organization

- Server-client separation maintained throughout
- Type safety enforced at all layers
- Database operations use Drizzle ORM with type-safe queries
- TanStack DB provides additional type-safe query builders on top of Drizzle

---

## Important Files

| File                  | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `README.md`           | Assignment requirements and submission notes              |
| `PLAN.md`             | Detailed implementation plan                              |
| `TEST.md`             | Manual test checklist                                     |
| `scripts/result.txt`  | Sample output showing expected CLI format with timestamps |
| `.planning/codebase/` | Generated codebase mapping documents                      |
| `pnpm-workspace.yaml` | pnpm workspace configuration                              |

---

## Implementation Guidance

**For backend track:** Keep it simple - in-memory data structures, clear bot/order state machine, timestamp formatting is critical for CI validation.

**For frontend track:** The `pos/` package is already bootstrapped with TanStack Start. Focus on implementing core functionality before adding advanced features.

---

## Service Architecture Patterns

### Singleton Pattern & getInstance() Usage

- **Use singleton pattern with getInstance()** for services that should have only one instance:
  - DatabaseService, CacheService
  - Configuration services, logging services, external API clients
- **Implement getInstance() methods** for services that manage:
  - Connections (database, external APIs)
  - Shared state (caches, session management)
  - Resource pooling (database connections, HTTP clients)
- **Avoid creating multiple instances** of:
  - Database clients (prevents connection pool exhaustion)
  - WebSocket connections (prevents duplicate connections)
  - External service clients (API clients, messaging services)

### HTTP API Calls & Centralized API Services

- **Use TanStack DB and TanStack Query** for frontend data access
- **API service responsibilities**:
  - Request/response standardization
  - Error handling and retry logic
  - Authentication token management
  - Request/response interception
  - Caching strategies

### Database Client Patterns

- **Use singleton pattern** for database connections to prevent connection pool exhaustion
- **Implement getInstance() pattern** for database services
- **Centralize database operations** through service layer
- **Connection management**:
  - Proper connection pooling configuration
  - Connection health checks and monitoring
  - Graceful connection cleanup
- **Query patterns**:
  - Always use Drizzle ORM through TanStack DB
  - Implement proper transaction handling
  - Use prepared statements for frequently executed queries

---

## React Development Patterns

### useEffect Best Practices

- **Always check dependencies** in useEffect hooks to ensure they're loaded
- **Implement proper cleanup** functions for side effects
- **Avoid infinite loops** by properly managing dependency arrays
- **Handle async operations** correctly with proper cleanup

### UI Component Conventions

- **Add purpose class names to all containers** - For every container element on the UI side, add a descriptive purpose class name that is NOT an existing Tailwind class name, making it easy to identify the container's purpose
- Example: `className="order-container pending-orders-panel"` instead of just `className="flex gap-4"`

---

## Development Rules & Best Practices

### Code Quality & Standards

- **Always run `pnpm lint:fix`** before committing and fix all errors
- **Use ESLint and Prettier** for consistent code formatting
- **Follow TypeScript strict mode** - never bypass type checking
- **Remove unused imports and variables** - keep code clean
- **Use consistent naming conventions** across the codebase
- **Avoid god files** - Break down large files into smaller, focused modules (max 300-400 lines)
- **Create reusable libraries/components** - Place reusable utilities in `src/lib/` and reusable components in `src/components/`

### Error Handling & Logging

- **All server endpoints must have error handling** that logs errors appropriately
- **Implement proper error boundaries** in React components
- **Use structured logging** for better debugging and monitoring
- **Never expose sensitive error details** to clients
- **Implement proper HTTP status codes** for API responses
- **No fallback mechanisms (with offline-sync exception)** - Avoid fallback logic or retries unless they already exist in the codebase, except for the frontend offline-sync flow where background sync and exponential backoff are allowed and expected

### Environment & Configuration

- **Never update .env files automatically** - ask user to update manually if needed
- **Always update `.env.example`** for any new environment variable or configuration
- **Never add guard environment variables** unless explicitly requested (e.g., GUARD\_\* variables)
- **Use environment variables** for all configuration values
- **Implement proper environment validation** with Zod schemas
- **Document required environment variables** in project documentation

### Git & Version Control

- **Never automatically commit changes** to git - only commit when explicitly asked
- **Write clear, descriptive commit messages** that explain the "why"
- **Keep commits atomic** - each commit should address one logical change
- **Use proper branching strategies** for feature development

### Database Operations

- **Generate migration scripts** via `pnpm db:generate` - never manually modify existing migration files
- **Review and modify generated migrations** to ensure DROP CONSTRAINT statements include IF EXISTS checks
- **Update seed files** when changing unique constraints or adding new tables
- **Test migrations** in development environment before applying to production
- **Do not run db:studio script** without explicit user request
- **Do not use drizzle-kit push or pull commands** - always use proper migrations via generate and migrate

### Service Development

- **Do not rearrange methods** without explicit approval
- **Do not attempt to start services** automatically
- **Follow established patterns** for service initialization and lifecycle
- **Implement proper service discovery** and configuration management

### Performance & Optimization

- **Use proper caching strategies** for frequently accessed data
- **Implement connection pooling** for database and external service connections
- **Optimize database queries** with proper indexing and query structure
- **Use lazy loading** for large datasets and resources

### Security Considerations

- **Never expose sensitive data** in logs, error messages, or API responses
- **Implement proper authentication** and authorization for all endpoints
- **Use HTTPS** for all production communications
- **Validate all input data** to prevent injection attacks
- **Implement proper CORS configuration** for API endpoints

---

## AI Agent Development Guidelines

### Code Generation Rules

- **Never create files unnecessarily** - Edit existing files when possible
- **When refactoring, modify existing files** - Do not create a new file to replace the original; modify the existing one (create new files only for dependencies as needed)
- **Follow existing patterns** - Don't introduce new frameworks or libraries without approval
- **Maintain consistency** - Use the same coding style as existing code
- **Proper error handling** - Always handle potential errors appropriately
- **Type safety first** - Never sacrifice type safety for convenience
- **Do not change bun build -type** in package.json without explicit approval
- **Accuracy and fast failure** - Everything must be accurate and fast fail unless explicitly intended otherwise

### Quality Assurance

- **Test thoroughly** - Run all available tests and checks
- **Check for regressions** - Ensure changes don't break existing functionality
- **Performance considerations** - Keep performance in mind for all changes
- **Security review** - Ensure all changes follow security best practices

### Decision Making

- **If bigger change would be beneficial**, explain why and get approval
- **Always suggest best practices** even if user requests something suboptimal
- **If user asks for suboptimal approach**, explain the better approach and ask which way to proceed
- **Confirm contradictions** - When making requests that contradict existing MD file logics, confirm with user first

---

## Documentation Standards

### Central Point of Truth

- **All MD files serve as central documentation** for business logic and technical logic
- **No code snippets in general use** - MD files should focus on concepts, processes, and requirements
- **Business logic documentation** should explain what the system does, not how it does it
- **Technical logic documentation** should describe architecture, patterns, and design decisions
- **Reference code files by path** instead of embedding code examples

### Content Guidelines

- **Business Logic**: Use cases, workflows, user requirements, domain concepts
- **Technical Logic**: Architecture patterns, design principles, integration points
- **Avoid Implementation Details**: Do not include code examples unless absolutely necessary for understanding

### Update Requirements

- **Refer to MD files before changes** - Always review relevant MD files for business and technical guidance before implementing fixes, new features, or coding changes
- **Update all relevant MD files** when business logic or technical logic changes
- **Cross-reference between MD files** to maintain consistency
- **Confirm contradictions** - When making requests that contradict existing MD file logics, confirm with user first
- **MD file maintenance** - Ensure all MD files are updated when business or technical logic changes
