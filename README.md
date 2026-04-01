# McDonald's Bot Manager

A CLI application that simulates a McDonald's order processing system with bots that automatically pick up and complete orders.

## Prerequisites

- **Node.js** ≥ 18

## Getting Started

```bash
# Install dependencies
npm install

# Run in interactive mode
npm run dev:interactive

# Run the automated demo
npm run dev:demo
```

## Interactive Commands

| Command       | Description        |
| ------------- | ------------------ |
| `addOrder`    | New normal order   |
| `addOrderVIP` | New VIP order      |
| `addBot`      | Add a bot          |
| `removeBot`   | Remove a bot       |
| `status`      | View current state |
| `help`        | Show command menu  |
| `q`           | Quit               |

## Scripts

| Script                 | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev:interactive` | Start interactive CLI (dev)   |
| `npm run dev:demo`        | Run automated demo (dev)      |
| `npm run build`           | Compile TypeScript to `dist/` |
| `npm run start:interactive` | Run compiled build (interactive) |
| `npm run start:demo`       | Run compiled build (demo)     |
| `npm test`                | Run tests                      |

## Project Structure

```
src/
├── index.ts                  # Entry point & event wiring
├── cli/
│   ├── cli.service.ts        # Interactive command handler
│   └── cli.service.spec.ts
├── demo/
│   └── demo.service.ts       # Automated demo runner
├── manager/
│   ├── bot-manager.service.ts # Core orchestration
│   └── bot-manager.service.spec.ts
├── bot/
│   ├── bot.model.ts
│   ├── bot.service.ts
│   └── bot.service.spec.ts
├── order/
│   ├── order.model.ts
│   ├── order-queue.service.ts
│   └── order-queue.service.spec.ts
└── logger/
    ├── logger.service.ts
    └── logger.service.spec.ts
```

## Testing

```bash
npm test
```
