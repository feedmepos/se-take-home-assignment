# McDonald's Order Controller

A Node.js CLI application that simulates McDonald's automated cooking bot order management system.

## Requirements

- Node.js 18+
- npm

## Getting Started

### Install & Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Run Automated Simulation

Executes a pre-scripted simulation and writes output to `scripts/result.txt`.

```bash
bash scripts/run.sh
```

### Run Interactive Mode

Launches an interactive CLI where you can manage orders and bots in real time.

```bash
npm start
```

**Available commands:**

| Command | Action |
|---------|--------|
| `N` | Create a Normal order |
| `V` | Create a VIP order |
| `+` | Add a cooking bot |
| `-` | Remove a cooking bot |
| `S` | Show current status |
| `Q` | Quit |

## How It Works

- **VIP orders** are placed ahead of all Normal orders in the queue, but behind existing VIP orders (FIFO within each type).
- Each **cooking bot** processes one order at a time, taking 10 seconds per order.
- When a bot is removed while processing, the order is **requeued** at the front of its type group. If an idle bot is available, it will immediately pick up the requeued order.
- Bots become **IDLE** when there are no pending orders and will automatically pick up the next order when one arrives.
