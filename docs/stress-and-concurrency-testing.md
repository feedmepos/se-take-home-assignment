# Stress and Concurrency Testing

This note records the extra checks used beyond the assessment CI contract. The
required CI path remains:

```bash
bash scripts/test.sh
bash scripts/build.sh
bash scripts/run.sh
```

The stress checks are optional evidence for review. They are deliberately kept out
of the required workflow so the take-home stays small and predictable.

## How to Run

Build first, then run the standalone stress script:

```bash
bash scripts/build.sh
node scripts/stress-check.js
```

Expected output:

```text
PASS highThroughputDrain ...
PASS requeueUnderLoad ...
PASS concurrentMicrotasks ...
PASS apiConcurrentSmoke ...
```

## What Was Tested

### High Throughput Domain Drain

- Creates 5,000 in-memory orders.
- Adds 250 bots.
- Uses the fake clock to advance repeated 10-second cook windows instantly.
- Verifies:
  - all orders eventually reach `COMPLETE`;
  - no order appears in more than one state;
  - every processing bot points to a real processing order;
  - all bots return to `IDLE`.

This is a throughput/invariant test of the pure domain core, not a CPU benchmark.

### Requeue Under Load

- Creates 20 normal orders and 5 bots.
- Removes the newest bot while it is processing.
- Verifies the requeued order returns ahead of later normal orders.
- Adds a replacement bot and verifies that bot resumes the requeued order first.
- Drains all orders with the fake clock.

This directly targets the README requirement for `- Bot` while processing.

### Concurrent Microtask Scheduling

- Schedules 1,000 order creations and 50 bot creations through `Promise` microtasks.
- Verifies no lost orders, duplicate orders, invalid bot links, or over-assignment.
- Drains with the fake clock.

This is legitimate for Node.js because application mutations are synchronous and
run on a single event loop. It does not simulate multi-process shared memory,
because this prototype intentionally has no shared database or multi-instance
state.

### API Concurrent Smoke

- Starts the compiled Nest app on an ephemeral local port.
- Sends 120 concurrent `POST /api/orders` requests.
- Sends 12 concurrent `POST /api/bots` requests.
- Verifies:
  - all creates succeed;
  - order ids remain unique;
  - the first processing batch is VIP, proving priority survives through HTTP;
  - the first 12 orders complete after a real 10-second window;
  - deleting all active bots does not lose orders.

This is an adapter-level smoke test. It is not a load test of infrastructure,
networking, Cloud Run, or browser clients.
