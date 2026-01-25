# McDonald's AutoCook - Implementation Plan

## 1. Problem Statement

McDonald's needs an automated order processing system that:
- Manages customer orders with different priority levels (normal vs VIP)
- Processes orders using cooking bots (10 seconds per order)
- Handles dynamic scaling (adding/removing bots)
- VIP orders processed before normal orders (FIFO within each type)

---

## 2. Requirements

| Feature | Behavior |
|---------|----------|
| **New Normal Order** | Added to PENDING queue at the end |
| **New VIP Order** | Added to PENDING queue ahead of normal orders, behind existing VIP orders |
| **Order Numbering** | Unique, incrementing from 1 |
| **+ Bot** | Creates bot, immediately processes pending orders (10s each), then idles |
| **- Bot** | Removes newest bot. If processing, order returns to PENDING |
| **No Persistence** | In-memory only |

**Technical**: Go CLI, output to `result.txt` with `HH:MM:SS` timestamps

---

## 3. Architecture

```
├── config/dependencies.go      # Dependency injection
├── data/
│   ├── models/                 # OrderModel, BotModel with ToEntity()
│   └── repositories/           # InMemoryOrderRepository, InMemoryBotRepository
├── domain/
│   ├── entities/               # Order, Bot
│   ├── interfaces/             # Repository interfaces
│   ├── mocks/                  # MockOrderRepository, MockBotRepository
│   └── usecases/               # CreateOrder, AddBot, RemoveBot, ProcessOrders, GetStatus
├── presentation/cli.go         # CLI, implements SimulationController, owns OutputWriter interface
├── simulation/workflow.go      # Demo workflows, owns SimulationController interface
├── utils/output_writer.go      # File output
├── scripts/                     # test.sh, build.sh, run.sh
└── main.go
```

---

## 4. Domain Entities

### Order
```
Order:
    ID: integer
    Type: "NORMAL" | "VIP"
    Status: "PENDING" | "PROCESSING" | "COMPLETE"
    CreatedAt: timestamp
    ProcessingStartedAt: timestamp (nullable)
    CompletedAt: timestamp (nullable)
```

### Bot
```
Bot:
    ID: integer
    IsProcessing: boolean
    CurrentOrderID: integer (0 if idle)
```

---

## 5. Interfaces

```
OrderRepository:
    CreateOrder(orderType) -> Order
    GetPendingOrders() -> Order[]           // VIP first, then NORMAL (FIFO within type)
    GetAllOrders() -> Order[]
    GetOrderByID(orderID) -> Order
    UpdateOrderStatus(orderID, status)
    ClaimNextPendingOrder() -> Order        // Atomically claim next pending

BotRepository:
    AddBot() -> Bot
    RemoveBot()                             // Removes newest bot (LIFO)
    GetAllBots() -> Bot[]
    GetIdleBots() -> Bot[]
    UpdateBotStatus(botID, isProcessing, orderID)

SimulationController:
    CreateNormalOrder() -> error
    CreateVIPOrder() -> error
    AddBot() -> error
    RemoveBot() -> error
    ProcessPendingOrders()
```

---

## 6. Use Cases

### CreateOrderUseCase
Create order with PENDING status, return order + queue count.

### AddBotUseCase
Create new bot, return bot + pending count.

### RemoveBotUseCase
Remove newest bot. If processing, set order back to PENDING first.

### ProcessOrdersUseCase
1. Assign pending orders to all idle bots (parallel)
2. Complete all assigned orders after simulated 10s
3. Repeat until no idle bots or no pending orders

### GetStatusUseCase
Get all orders/bots, categorize orders by status.

**VIP Priority Fix**: Sort pending orders with VIP first:
```
sortPendingOrders(orders):
    STABLE SORT orders WHERE VIP orders come before NORMAL orders
    (maintains FIFO within each priority level)
```

---

## 7. Output Format

```
Header: "McDonald's Order Management System - Simulation Results"
Timestamp format: [HH:MM:SS]

Message formats:
    [HH:MM:SS] System initialized with 0 bots
    [HH:MM:SS] Created Normal/VIP Order #X - Status: PENDING
    [HH:MM:SS] Bot #X created - Status: ACTIVE
    [HH:MM:SS] Bot #X picked up Normal/VIP Order #X - Status: PROCESSING
    [HH:MM:SS] Bot #X completed Normal/VIP Order #X - Status: COMPLETE (Processing time: Xs)
    [HH:MM:SS] Bot #X is now IDLE - No pending orders
    [HH:MM:SS] Bot #X destroyed while IDLE/PROCESSING

Final Status:
    - Total Orders Processed: X (Y VIP, Z Normal)
    - Orders Completed: X
    - Active Bots: X
    - Pending Orders: X
```

---

## 8. Build & Run

```
./scripts/test.sh   # Run tests
./scripts/build.sh  # Build executable
./scripts/run.sh    # Run simulation
```
