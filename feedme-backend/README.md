# McDonald's Order Controller - Backend API

A Node.js + Express + TypeScript REST API for McDonald's automated cooking bot order management system.

## Tech Stack

- **Backend Framework**: Node.js + Express + TypeScript
- **Package Manager**: Yarn
- **Database**: PostgreSQL (Prisma schema defined, but using in-memory storage per requirement #7)
- **Authentication**: JWT (JSON Web Token)
- **ORM**: Prisma (schema ready for future database integration)

## Project Structure

```
feedme-backend/
├── src/
│   ├── types/
│   │   ├── Order.ts          # Order type definitions
│   │   └── Bot.ts            # Bot type definitions
│   ├── services/
│   │   ├── OrderController.ts        # Core order management logic
│   │   └── OrderControllerSingleton.ts # Singleton instance
│   ├── middleware/
│   │   └── auth.ts           # JWT authentication middleware
│   ├── routes/
│   │   ├── orders.ts         # Order API endpoints
│   │   ├── bots.ts           # Bot API endpoints
│   │   └── auth.ts           # Authentication endpoints
│   ├── app.ts                # Express app configuration
│   ├── index.ts              # API server entry point
│   └── cli.ts                # CLI simulation mode
├── prisma/
│   └── schema.prisma         # Database schema (for future use)
├── dist/                     # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## Features

### Order Management
- **Normal Orders**: Added to PENDING queue, processed in FIFO order
- **VIP Orders**: Prioritized over Normal orders, but queue behind existing VIP orders
- **Unique Order IDs**: Auto-incrementing order numbers starting from 1001

### Bot Management
- **Add Bot**: Creates a new bot that immediately starts processing pending orders
- **Remove Bot**: Removes the newest bot. If processing an order, returns it to PENDING queue
- **Processing Time**: Each order takes exactly 10 seconds to complete
- **Idle State**: Bots become IDLE when no orders are available

### API Endpoints

#### Authentication
- `POST /api/auth/login` - Login and get JWT token
  ```json
  {
    "username": "user",
    "password": "pass"
  }
  ```

#### Orders
- `POST /api/orders/normal` - Create a normal order (requires auth)
- `POST /api/orders/vip` - Create a VIP order (requires auth)
- `GET /api/orders` - Get all orders (requires auth)
- `GET /api/status` - Get system status (requires auth)

#### Bots
- `POST /api/bots` - Add a new bot (requires auth)
- `DELETE /api/bots` - Remove the newest bot (requires auth)
- `GET /api/bots` - Get all bots (requires auth)

#### System
- `GET /health` - Health check (no auth required)
- `POST /api/init` - Initialize system (requires auth)

## Installation & Setup

### Prerequisites
- Node.js 18+
- Yarn package manager

### Install Dependencies
```bash
cd feedme-backend
yarn install
```

### Build
```bash
yarn build
```

### Development
```bash
# Run API server in development mode
yarn dev:api

# Run CLI simulation in development mode
yarn dev:cli
```

### Production
```bash
# Run API server
yarn start:api

# Run CLI simulation (for result.txt output)
yarn start:cli
```

## API Usage Examples

### 1. Get Authentication Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "user", "role": "user" }
}
```

### 2. Create Normal Order
```bash
curl -X POST http://localhost:3000/api/orders/normal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Create VIP Order
```bash
curl -X POST http://localhost:3000/api/orders/vip \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Add Bot
```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 5. Remove Bot
```bash
curl -X DELETE http://localhost:3000/api/bots \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Get Status
```bash
curl -X GET http://localhost:3000/api/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## CLI Mode

The application also includes a CLI simulation mode that runs the same logic and outputs to `result.txt`:

```bash
# Using scripts (from project root)
bash scripts/run.sh

# Or directly
cd feedme-backend
yarn start:cli
```

## Environment Variables

Create a `.env` file (see `.env.example`):

```env
JWT_SECRET=your-secret-key-change-in-production
PORT=3000
# DATABASE_URL="postgresql://user:password@localhost:5432/mcdonalds_db"
```

## Requirements Met

✅ Node.js + Express + TypeScript  
✅ Yarn package manager  
✅ Prisma schema (ready for PostgreSQL)  
✅ JWT authentication  
✅ REST API endpoints  
✅ In-memory storage (no persistence per requirement #7)  
✅ CLI mode for result.txt output  
✅ All order management requirements  
✅ All bot management requirements  

## Testing

```bash
# Run tests
yarn test

# Or using scripts
bash scripts/test.sh
```

## Notes

- **No Database**: Per requirement #7, the system uses in-memory storage. Prisma schema is provided for future database integration.
- **JWT Authentication**: All API endpoints (except `/health` and `/api/auth/login`) require a valid JWT token in the `Authorization` header.
- **Singleton Pattern**: OrderController uses a singleton pattern to maintain state across API requests.
- **CLI Compatibility**: The CLI mode maintains compatibility with the original scripts for `result.txt` output.
