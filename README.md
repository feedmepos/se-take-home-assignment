McDonald's Order Management System (CLI Prototype)

Overview
- This project simulates a McDonald's automated order management system using Node.js. It demonstrates backend order processing with VIP and normal orders, and dynamic bot management.
- The system logs all actions to scripts/result.txt with timestamps in HH:MM:SS format.

Features
- Create Orders
  - Normal orders (NORMAL)
  - VIP orders (VIP), processed before normal orders.

- Bot Management
  - Add bots (+ Bot) – immediately process pending orders.
  - Remove bots (- Bot) – processing order returns to pending.

- Order Processing
  - Each order takes 10 seconds to complete.
  - Bots pick the next available order automatically.
  - Idle bots wait until new orders are added.

Data Structures
- Orders - Objects with properties:
  - id: unique identifier
  - type: NORMAL or VIP
  - status: PENDING, PROCESSING, COMPLETE
  - createdAt, startedAt, completedAt: timestamps

- Bots - Objects with properties:
  - id
  - currentOrder
  - status: ACTIVE or IDLE
  - timer: tracks processing duration

- Queues - Two separate arrays for pending orders:
  - vipQueue
  - normalQueue

--- Order Status Breakdown ---
- Order Status
  - PENDING – Order created but not yet processed.
  - PROCESSING – Currently being handled by a bot.
  - COMPLETE – Finished processing.

- Bot Status
  - ACTIVE – Bot is processing an order.
  - IDLE – Bot is waiting for orders.

Order & Bot Flow

<img width="321" height="391" alt="Feedme assignment drawio" src="https://github.com/user-attachments/assets/24204bf3-7e5f-4160-bcac-d192eb78a609" />

Explanation:
- New Order: Submitted by a user (NORMAL or VIP).
- PENDING: Order waits in queue; VIP orders have priority.
- Bot picks order: An ACTIVE bot processes the order for 10 seconds.
- Idle Bot: If no pending orders exist, bot remains IDLE.
- COMPLETE: Order finishes processing; timestamps recorded; bot becomes available for the next order.

Future Improvements
- Data Storage: Save orders and bot states in a database.
- Multiple Order Types & Priorities: Extend the system to handle more priority levels or special orders.
- Concurrency & Scaling: Enable multiple bots to process orders concurrently with more robust queue handling.
- Error Handling & Retry Logic: Improve bot failure handling, order retries, and logging of exceptions.
