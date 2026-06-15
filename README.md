# McDonald's Order Controller

This repository contains two implementations of the order controller prototype:

- `frontend/`: Next.js + Tailwind CSS interactive UI.
- `backend/`: Node.js CLI implementation with unit tests and scripted output.

## Frontend

```bash
npm ci --prefix frontend
npm --prefix frontend run dev
npm --prefix frontend run lint
npm --prefix frontend run build
```

The frontend package lives in `frontend/package.json`.

## Backend CLI

The backend is a Node.js CLI application. It uses a virtual kitchen clock so CI can verify the 10-second cooking rule without waiting in real time.

```bash
npm ci --prefix backend
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

`scripts/run.sh` runs the deterministic demo mode and writes the CLI result to `scripts/result.txt`. The output includes `HH:MM:SS` timestamps for order start and completion events.

Interactive mode is the default backend start command:

```bash
npm --prefix backend start
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
