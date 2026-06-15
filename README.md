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

`scripts/run.sh` runs the deterministic demo mode and writes the CLI result to `scripts/result.txt`. The output includes current local `HH:MM:SS` timestamps for order start and completion events.

Interactive mode is the default backend start command. It prints help immediately, and cooking time advances automatically while the CLI is open.

```bash
npm --prefix backend start
node backend/src/cli.js
```

Supported commands:

| Command | Shortcut | Description |
| --- | --- | --- |
| `normal` | `n` | Create a Normal order |
| `vip` | `v` | Create a VIP order |
| `+bot` | `+` | Add one cooking bot |
| `-bot` | `-` | Remove the latest bot |
| `status` | `s` | Print the current kitchen state |
| `help` | `h`, `?` | Show command help |
| `exit` | `q` | Stop interactive mode |
