# McDonald's Order Controller

This repository contains two implementations of the order controller prototype:

- `frontend/`: Next.js + Tailwind CSS interactive UI.
- `backend/`: Node.js CLI implementation with unit tests and scripted output.

## Frontend

```bash
npm run dev
npm run lint
npm run build
```

The frontend runs from the `frontend/` directory through the root package scripts.

## Backend CLI

The backend is a Node.js CLI application. It uses a virtual kitchen clock so CI can verify the 10-second cooking rule without waiting in real time.

```bash
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

`scripts/run.sh` writes the CLI result to `scripts/result.txt`. The output includes `HH:MM:SS` timestamps for order start and completion events.

Interactive mode is also available:

```bash
node backend/src/cli.js
```

Supported commands:

- `normal`
- `vip`
- `add-bot`
- `remove-bot`
- `tick <seconds>`
- `status`
- `help`
- `exit`
