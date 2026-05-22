# McDonald's Order Controller — System Flow

## Order Flow

```
New Normal Order              New VIP Order
      │                             │
      ▼                             ▼
 Create Order                  Create Order
 (ID auto-increment)          (ID auto-increment)
      │                             │
      ▼                             ▼
 Append to END               Insert after last VIP
 of queue                    (before all NORMAL orders)
      │                             │
      └──────────┬──────────────────┘
                 ▼
           Any IDLE Bot?
                 │
         ┌───────┴───────┐
         │ Yes           │ No
         ▼               ▼
    Bot picks up    Order waits
    from queue      in PENDING
```

---

## Bot Processing

```
Bot picks up Order from head of queue
      │
      ▼
 Status: PROCESSING
 ⏱ countdown 10 seconds
      │
      ▼
 Move Order → COMPLETE
      │
      ▼
 Any Order left in PENDING?
      │
 ┌────┴────┐
 │ Yes     │ No
 ▼         ▼
Pick up   Bot → IDLE
next      (waits for
Order     new Order)
```

---

## + Bot

```
Create new Bot
(ID auto-increment)
      │
      ▼
 Any Order in PENDING?
      │
 ┌────┴────┐
 │ Yes     │ No
 ▼         ▼
Pick up   Bot → IDLE
Order
```

---

## - Bot

```
Select newest Bot (highest ID)
      │
      ▼
 Currently processing?
      │
 ┌────┴──────────┐
 │ Yes           │ No
 ▼               ▼
Stop          Remove Bot
immediately
      │
      ▼
 Return Order to head of queue
 (respects VIP/NORMAL priority)
      │
      ▼
 Remove Bot
```

---

## Order State

```
            ┌──── Bot removed ────┐
            │                     │
            ▼                     │
PENDING ──────────► PROCESSING ───┘──► COMPLETE
  (queue)    Bot picks up  (10 seconds)
```

---

## Queue Priority

```
HEAD                                      TAIL
 │                                          │
 ▼                                          ▼
[VIP #1] → [VIP #3] → [NORMAL #2] → [NORMAL #4]
 └──── VIP group ────┘  └───── NORMAL group ─────┘
       (FIFO)                    (FIFO)
```

---

## Assumption: Bot Removed While Processing

When a bot is removed, the order is re-inserted into the queue **sorted by ID ascending** within its group (VIP or NORMAL). Lower ID = arrived earlier = processed first.

```
Before:  [botA → vip1] [botB → vip2]   queue: [vip3]

Remove botA
      │
      ▼
vip1 re-inserts into VIP group by ID order

After:   [botB → vip2]   queue: [vip1, vip3]  ✓
                                 NOT [vip3, vip1]  ✗
```
