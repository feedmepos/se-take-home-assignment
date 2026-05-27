# Feedme SW Assignment

The assignment is developed using Next.js with Typescript & Ant Design.

## What it demonstrates

- New normal orders flow into the pending queue.
- VIP orders are inserted ahead of normal orders, but behind any already waiting VIP orders.
- Bots process one order at a time for 10 seconds.
- Adding a bot immediately starts work if there is a pending order.
- Removing the newest bot stops its work and sends the order back to pending.

## Run locally

From the repository root, run:

```bash
cd frontend
```

```bash
yarn install
yarn dev
```

## Build and verify

From the `frontend` directory:

```bash
yarn lint --fix
yarn build
```

## Notes

- The order and bot lifecycle is reset on refresh.
- The UI is styled with SCSS and Ant Design, and the board is built to show the required order flow.
