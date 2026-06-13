# Order Management

This repository contains a small order-management demo split into two parts:

- `order-management-service` — backend service implemented in Go (Gin). Provides order and bot management APIs.
- `order-management-web` — static frontend (HTML/JS/CSS) that calls the backend APIs and shows order lists.

## Backend (`order-management-service`)

- Main purpose: simulate order creation, bot workers, processing and completion. Maintains in-memory queues and bots.
- Key endpoints (HTTP JSON):
	- `POST /order/normal` — create a normal order
	- `POST /order/vip` — create a VIP order (priority)
	- `POST /bot/add` — add a worker bot
	- `POST /bot/remove` — remove the most recently added bot
	- `GET /orders` — returns JSON with `all` (all orders), `pending_queue` and `bot_count`

Start backend (from the repository root or any shell):
```bash
cd order-management-service
go mod tidy
go run .
# service listens on :8080 by default
```

## Frontend (`order-management-web`)

- Main purpose: provide admin UI to create orders, add/remove bots, and monitor Pending/Complete lists.
- Files: `index.html`, `app.js`, `styles.css` (static files). Uses `fetch` to call backend on `http://localhost:8080`.

Frontend access (open directly):
```bash
# Open the static frontend by opening the file in your browser
# For example, double-click or open this file in your browser:
# order-management-web/index.html
# Or use a file URL like: file:///path/to/order-management-web/index.html
```

Notes:
- The frontend expects the backend at `http://localhost:8080`. If you run the backend on a different host/port, edit `order-management-web/app.js` and update `BASE`.
- `go mod tidy` should be run inside `order-management-service` to populate `go.sum` (the repository includes the generated files).
