# Requirements Specification

This document breaks down every requirement with detailed explanations and Mermaid diagrams.

---

## System Overview

```mermaid
graph TB
    subgraph Users
        NC[👤 Normal Customer]
        VC[👤 VIP Customer]
        MG[👔 Manager]
    end

    subgraph System["🍔 Order Controller"]
        OQ[📋 Order Queue<br/>Priority: VIP → Normal]
        BC[🤖 Bot Controller]
    end

    subgraph Areas
        PA[🟡 PENDING Area]
        PR[⚙ PROCESSING]
        CA[🟢 COMPLETE Area]
    end

    NC -->|"[1] New Normal Order"| OQ
    VC -->|"[2] New VIP Order"| OQ
    MG -->|"[3] Add Bot"| BC
    MG -->|"[4] Remove Bot"| BC

    OQ --> PA
    BC -->|pickup order| PA
    PA -->|bot processes| PR
    PR -->|after 10s| CA
```

---

## R1: New Normal Order

> When "New Normal Order" clicked, a new order should show up in "PENDING" Area.

### Behavior

- User presses `[1]`
- System creates an order with auto-incremented ID
- Order type = `NORMAL`
- Order status = `PENDING`
- Order is appended to the **end** of the pending queue
- If any bot is `IDLE`, it immediately picks up this order

### Flow

```mermaid
flowchart LR
    A["User presses [1]"] --> B[Create Order<br/>type: NORMAL<br/>status: PENDING]
    B --> C{Any IDLE bot?}
    C -->|Yes| D[Bot picks up order<br/>status → PROCESSING]
    C -->|No| E[Order stays in<br/>PENDING queue]
```

### Queue Position Example

```
Before:  [VIP#2] → [Normal#1]
Action:  New Normal Order #3
After:   [VIP#2] → [Normal#1] → [Normal#3]
                                  ↑ appended at end
```

---

## R2: New VIP Order (Priority Queue)

> When "New VIP Order" clicked, a new order should show up in "PENDING" Area. It should place in-front of all existing "Normal" order but behind of all existing "VIP" order.

### Behavior

- User presses `[2]`
- System creates an order with auto-incremented ID
- Order type = `VIP`
- Order status = `PENDING`
- Order is inserted **after the last VIP order** but **before the first Normal order**
- If any bot is `IDLE`, it immediately picks up the highest-priority pending order

### Flow

```mermaid
flowchart LR
    A["User presses [2]"] --> B[Create Order<br/>type: VIP<br/>status: PENDING]
    B --> C[Find insert position:<br/>after last VIP,<br/>before first Normal]
    C --> D[Insert into queue]
    D --> E{Any IDLE bot?}
    E -->|Yes| F[Bot picks up<br/>highest priority order]
    E -->|No| G[Order waits in queue]
```

### Priority Insertion Logic

```mermaid
flowchart TD
    A[New VIP Order] --> B[Scan queue from index 0]
    B --> C{Current item is VIP?}
    C -->|Yes| D[Move to next index]
    D --> C
    C -->|No or end of queue| E[Insert at this index]
```

### Queue Position Examples

```
Example 1 — Insert among existing VIPs:
  Before:  [VIP#1] → [Normal#2] → [Normal#3]
  Action:  New VIP Order #4
  After:   [VIP#1] → [VIP#4] → [Normal#2] → [Normal#3]
                      ↑ after last VIP, before first Normal

Example 2 — No existing VIPs:
  Before:  [Normal#1] → [Normal#2]
  Action:  New VIP Order #3
  After:   [VIP#3] → [Normal#1] → [Normal#2]
            ↑ inserted at front

Example 3 — Multiple VIPs exist:
  Before:  [VIP#1] → [VIP#3] → [Normal#2] → [Normal#4]
  Action:  New VIP Order #5
  After:   [VIP#1] → [VIP#3] → [VIP#5] → [Normal#2] → [Normal#4]
                                 ↑ after all existing VIPs

Example 4 — Empty queue:
  Before:  (empty)
  Action:  New VIP Order #1
  After:   [VIP#1]
```

---

## R3: Unique & Increasing Order Numbers

> The order number should be unique and increasing.

### Behavior

- Order IDs start at `1`
- Each new order (VIP or Normal) gets the next sequential number
- IDs never repeat, even if orders are completed or returned to queue
- The counter never resets during a session

### Flow

```mermaid
flowchart LR
    A[Order #1<br/>Normal] --> B[Order #2<br/>VIP] --> C[Order #3<br/>Normal] --> D[Order #4<br/>VIP]
    style A fill:#f0f0f0
    style B fill:#fff3cd
    style C fill:#f0f0f0
    style D fill:#fff3cd
```

### Rules

```
✓ Order #1 (Normal), #2 (VIP), #3 (Normal) — correct, always increasing
✗ Order #1 (Normal), #1 (VIP)              — wrong, duplicate ID
✗ Order #3 (Normal), #2 (VIP)              — wrong, not increasing
```

---

## R4: Bot Processing (10 seconds)

> When "+ Bot" clicked, a bot should be created and start processing the order inside "PENDING" area. After 10 seconds picking up the order, the order should move to "COMPLETE" area. Then the bot should start processing another order if there is any left in "PENDING" area.

### Behavior

- User presses `[3]`
- New bot is created with auto-incremented ID
- Bot immediately checks the pending queue
- If orders exist: bot picks up the **first order** (highest priority) and starts processing
- Processing takes exactly **10 seconds** (`setTimeout`)
- After 10 seconds: order status → `COMPLETE`, moved to complete area
- Bot then checks the queue again for the next order
- Bot can only process **1 order at a time**

### Flow

```mermaid
flowchart TD
    A["User presses [3]"] --> B[Create Bot<br/>status: IDLE]
    B --> C{Pending orders?}
    C -->|Yes| D[Pick up first order<br/>Bot status → PROCESSING<br/>Order status → PROCESSING]
    C -->|No| E[Bot stays IDLE]
    D --> F[Wait 10 seconds]
    F --> G[Order status → COMPLETE<br/>Move to COMPLETE area]
    G --> H{More pending orders?}
    H -->|Yes| D
    H -->|No| E
    E -->|New order arrives| C
```

### Bot Processing Lifecycle

```mermaid
stateDiagram-v2
    [*] --> IDLE: Bot created
    IDLE --> PROCESSING: Order available in queue
    PROCESSING --> IDLE: Order completed (10s) + no more orders
    PROCESSING --> PROCESSING: Order completed (10s) + pick up next order
    IDLE --> [*]: Bot destroyed
    PROCESSING --> [*]: Bot destroyed
```

### Multiple Bots — Parallel Processing

```mermaid
sequenceDiagram
    participant Q as 📋 Queue
    participant B1 as 🤖 Bot #1
    participant B2 as 🤖 Bot #2
    participant C as 🟢 Complete

    Note over Q: [VIP#2, Normal#1, Normal#3]

    Q->>B1: VIP Order #2 (highest priority)
    Q->>B2: Normal Order #1 (next in queue)
    Note over Q: [Normal#3] remaining

    Note over B1: Processing 10s...
    Note over B2: Processing 10s...

    B1->>C: VIP Order #2 ✓
    B1->>Q: Request next order
    Q->>B1: Normal Order #3

    B2->>C: Normal Order #1 ✓
    B2->>Q: Request next order
    Note over B2: Queue empty → IDLE
```

---

## R5: Bot IDLE State

> If there is no more order in the "PENDING" area, the bot should become IDLE until a new order comes in.

### Behavior

- After a bot completes an order, it checks the pending queue
- If queue is empty: bot status → `IDLE`
- Bot remains `IDLE` until a new order is added to the queue
- When a new order arrives, the system checks for idle bots and assigns the order

### Flow

```mermaid
flowchart TD
    A[Bot completes order] --> B{Pending queue empty?}
    B -->|No| C[Pick up next order<br/>Continue PROCESSING]
    B -->|Yes| D[Bot status → IDLE<br/>Wait for new order]
    D --> E{New order created?}
    E -->|Yes| F[Bot picks up new order<br/>status → PROCESSING]
    E -->|No| D
```

### Idle Bot Resume — Trigger Points

```mermaid
flowchart LR
    subgraph Triggers["Events that wake an IDLE bot"]
        T1["[1] New Normal Order"]
        T2["[2] New VIP Order"]
    end

    T1 --> CHECK{Any IDLE bot?}
    T2 --> CHECK
    CHECK -->|Yes| ASSIGN[Assign order to<br/>first IDLE bot]
    CHECK -->|No| QUEUE[Order stays in<br/>PENDING queue]
```

---

## R6: Bot Removal

> When "- Bot" clicked, the newest bot should be destroyed. If the bot is processing an order, it should also stop the process. The order should return to its original position in the "PENDING" area (maintaining VIP/Normal order priority).

### Behavior

- User presses `[4]`
- The **newest bot** (highest ID / last added) is removed
- If the bot was `IDLE`: simply destroy it
- If the bot was `PROCESSING`: 
  - Stop the 10s timer (`clearTimeout`)
  - Return the order to `PENDING` status
  - Re-insert the order into the queue at the correct priority position
- If no bots exist: show error message

### Flow

```mermaid
flowchart TD
    A["User presses [4]"] --> B{Any bots?}
    B -->|No| C[Show: No bots to remove]
    B -->|Yes| D[Select newest bot<br/>highest ID / last added]
    D --> E{Bot status?}
    E -->|IDLE| F[Destroy bot]
    E -->|PROCESSING| G[Stop timer<br/>clearTimeout]
    G --> H[Order status → PENDING]
    H --> I[Re-insert order into queue<br/>VIP → before Normal<br/>Normal → at end]
    I --> F
```

### Order Return — Priority Re-insertion

```mermaid
flowchart TD
    A[Order returned from destroyed bot] --> B{Order type?}
    B -->|VIP| C[Insert after last VIP<br/>before first Normal<br/>Same as R2 logic]
    B -->|Normal| D[Append to end of queue]
```

### Example — Bot Removed While Processing

```
State before removal:
  Bot #1: PROCESSING Normal Order #1
  Bot #2: PROCESSING VIP Order #4
  Queue:  [Normal#3, Normal#5]

Action: Remove Bot (removes #2, the newest)

  Bot #2 destroyed
  VIP Order #4 returned to PENDING
  Queue after: [VIP#4, Normal#3, Normal#5]
               ↑ VIP re-inserted before all Normal orders

  Bot #1 continues processing Normal Order #1 (unaffected)
```

### Example — Multiple Removals

```
State:
  Bot #1: PROCESSING Normal Order #1
  Bot #2: IDLE
  Bot #3: PROCESSING VIP Order #5
  Queue:  [Normal#3]

Remove Bot → removes #3 (newest)
  VIP Order #5 → returned to queue
  Queue: [VIP#5, Normal#3]

Remove Bot → removes #2 (now newest)
  Bot #2 was IDLE, no order to return
  Queue: [VIP#5, Normal#3] (unchanged)

Remove Bot → removes #1 (last remaining)
  Normal Order #1 → returned to queue
  Queue: [VIP#5, Normal#1, Normal#3]
         ↑ VIP still first, Normal #1 re-inserted at end
```

---

## R7: No Data Persistence

> No data persistence is needed for this prototype, you may perform all the process inside memory.

### Behavior

- All state is stored in JavaScript class instances (arrays, objects)
- No files, databases, or external storage
- State resets when the application restarts
- The only file output is `result.txt` (generated by the scripted simulation)

```mermaid
flowchart LR
    subgraph Memory["In-Memory State"]
        OQ["orderQueue[]"]
        CO["completedOrders[]"]
        BL["bots[]"]
        NID["nextOrderId: number"]
        NBID["nextBotId: number"]
    end

    subgraph NotUsed["NOT Used"]
        DB[(Database)]
        FS[File System]
        LS[LocalStorage]
    end

    Memory -.->|"app restart"| RESET["All state lost ✓"]
    NotUsed -.-x Memory

    style NotUsed fill:#ffcccc,stroke:#cc0000
    style Memory fill:#ccffcc,stroke:#00cc00
```

---

## Complete Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Order created
    PENDING --> PROCESSING: Bot picks up order
    PROCESSING --> COMPLETE: Bot finishes (10s)
    PROCESSING --> PENDING: Bot destroyed mid-processing (R6)

    note right of PENDING
        VIP orders positioned
        before Normal orders
    end note

    note right of PROCESSING
        Exactly 10 seconds
        1 order per bot
    end note

    note right of COMPLETE
        Final state
        Cannot go back
    end note
```

---

## Complete System Flow

```mermaid
flowchart TD
    subgraph Input["User Commands"]
        C1["[1] Normal Order"]
        C2["[2] VIP Order"]
        C3["[3] Add Bot"]
        C4["[4] Remove Bot"]
    end

    subgraph OrderCreation["Order Creation"]
        CO1[Create order with<br/>unique incremented ID]
        CO2{Order type?}
        CO3[Append to end<br/>of queue]
        CO4[Insert after last VIP<br/>before first Normal]
    end

    subgraph BotManagement["Bot Management"]
        BM1[Create new bot<br/>status: IDLE]
        BM2[Remove newest bot]
        BM3{Bot was processing?}
        BM4[Return order to queue<br/>with priority position]
        BM5[Destroy bot]
    end

    subgraph Processing["Order Processing"]
        P1{Pending orders<br/>+ IDLE bot?}
        P2[Bot picks up<br/>first order in queue]
        P3[Process for 10 seconds]
        P4[Move to COMPLETE]
        P5{More pending orders?}
    end

    C1 --> CO1
    C2 --> CO1
    CO1 --> CO2
    CO2 -->|Normal| CO3
    CO2 -->|VIP| CO4
    CO3 --> P1
    CO4 --> P1

    C3 --> BM1
    BM1 --> P1

    C4 --> BM2
    BM2 --> BM3
    BM3 -->|Yes| BM4
    BM4 --> BM5
    BM3 -->|No| BM5

    P1 -->|Yes| P2
    P1 -->|No| IDLE[Bot stays IDLE]
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 -->|Yes| P2
    P5 -->|No| IDLE

    style IDLE fill:#e0e0e0
```

---

## Data Model

```mermaid
classDiagram
    class Order {
        +number id
        +string type
        +string status
        +Date createdAt
        +Date pickedUpAt
        +Date completedAt
        +toString() string
    }

    class Bot {
        +number id
        +string status
        +Order currentOrder
        +number processingTime
        +Date idleSince
        +Timer timer
        +startProcessing(order, onComplete)
        +stopProcessing() Order
    }

    class OrderQueue {
        -Order[] orders
        +enqueue(order)
        +dequeue() Order
        +size() number
        +snapshot() string
    }

    class OrderController {
        -OrderQueue queue
        -Bot[] bots
        -Order[] completed
        -number nextOrderId
        -number nextBotId
        +addNormalOrder() Order
        +addVipOrder() Order
        +addBot() Bot
        +removeBot() Bot
        -processNextOrder()
        +getStatus() object
    }

    OrderController --> OrderQueue: manages
    OrderController --> Bot: creates/destroys
    OrderController --> Order: creates
    Bot --> Order: processes
    OrderQueue --> Order: stores
```

---

## Requirement Traceability Matrix

| Req | User Story | Test Scenario | CLI Command | Verification |
|-----|-----------|---------------|-------------|-------------|
| R1 | Normal customer → PENDING | Create normal order, verify in queue | `[1]` | Order appears at end of pending queue |
| R2 | VIP member → before Normal | Create VIP after Normal orders, check position | `[2]` | VIP inserted before all Normal, after existing VIP |
| R3 | Unique increasing numbers | Create multiple orders, check IDs | `[1]`, `[2]` | IDs are sequential: 1, 2, 3, 4... |
| R4 | Bot processes in 10s | Add bot with pending orders, wait | `[3]` | Order moves to COMPLETE after 10s |
| R5 | Bot goes IDLE | Bot finishes with empty queue | automatic | Bot status shows IDLE, resumes on new order |
| R6 | Remove newest bot | Remove bot mid-processing | `[4]` | Newest bot removed, order returns to correct queue position |
| R7 | No persistence | Restart app | automatic | All state resets, no files/DB used |
