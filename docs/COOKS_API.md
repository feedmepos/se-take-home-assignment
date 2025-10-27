# Cook Bots API Documentation

## Overview

The Cook Bots API provides endpoints for managing cook bots in the McMocknald Order Kiosk system. Cook bots are worker entities that process customer orders from the priority queue. The API supports dynamic bot creation, removal (soft delete), reinstatement, and manual order acceptance.

## Base URL

All Cook Bots API endpoints are under `/api/cooks`

---

## Endpoints

### 1. Create Cook Bot

Creates a new cook bot worker to process orders.

**Endpoint:** `POST /api/cooks`

**Request Body:**
```json
{
  "name": "Cook Bot 5"
}
```

**Parameters:**
- `name` (required, string): The name identifier for the cook bot

**Success Response:** `201 Created`
```json
{
  "id": 5,
  "name": "Cook Bot 5",
  "role": "Cook",
  "created_at": "2025-10-24T14:30:45Z",
  "modified_at": "2025-10-24T14:30:45Z"
}
```

**Response Fields:**
- `id`: Unique identifier for the cook bot
- `name`: Cook bot name
- `role`: Always "Cook" for cook bots
- `created_at`: Timestamp when cook was created
- `modified_at`: Timestamp when cook was last updated

**Error Responses:**
- `400 Bad Request` - Invalid request body or missing name
  ```json
  {
    "error": "invalid request body"
  }
  ```
- `500 Internal Server Error` - Server error
  ```json
  {
    "error": "failed to create cook: <error details>"
  }
  ```

**Examples:**
```bash
# Create a single cook bot
curl -X POST http://localhost:8080/api/cooks \
  -H "Content-Type: application/json" \
  -d '{"name": "Cook Bot Alpha"}'

# Create multiple cook bots in a loop
for i in {1..5}; do
  curl -X POST http://localhost:8080/api/cooks \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Cook Bot $i\"}"
done
```

**Business Rules:**
- Cook bot is immediately available to accept orders
- Cook bot starts in active state (not deleted)
- Automatically starts as a worker goroutine (in worker pool implementations)
- Role is automatically set to "Cook"

---

### 2. Get All Cook Bots

Retrieves all cook bots, with optional inclusion of soft-deleted cooks.

**Endpoint:** `GET /api/cooks`

**Query Parameters:**
- `include_deleted` (optional, boolean): Include soft-deleted cooks (default: false)

**Success Response:** `200 OK`

**Without deleted cooks (default):**
```json
[
  {
    "id": 5,
    "name": "Cook Bot 1",
    "role": "Cook",
    "created_at": "2025-10-24T14:00:00Z",
    "modified_at": "2025-10-24T14:00:00Z"
  },
  {
    "id": 6,
    "name": "Cook Bot 2",
    "role": "Cook",
    "created_at": "2025-10-24T14:00:00Z",
    "modified_at": "2025-10-24T14:00:00Z"
  }
]
```

**With deleted cooks (`include_deleted=true`):**
```json
[
  {
    "id": 5,
    "name": "Cook Bot 1",
    "role": "Cook",
    "created_at": "2025-10-24T14:00:00Z",
    "modified_at": "2025-10-24T14:40:00Z",
    "deleted_at": "2025-10-24T14:40:00Z"
  },
  {
    "id": 6,
    "name": "Cook Bot 2",
    "role": "Cook",
    "created_at": "2025-10-24T14:00:00Z",
    "modified_at": "2025-10-24T14:00:00Z"
  }
]
```

**Error Responses:**
- `500 Internal Server Error` - Server error
  ```json
  {
    "error": "failed to retrieve cooks"
  }
  ```

**Examples:**
```bash
# Get active cook bots only
curl http://localhost:8080/api/cooks

# Get all cook bots including deleted
curl "http://localhost:8080/api/cooks?include_deleted=true"
```

**Use Cases:**
- Monitor active worker count
- Audit deleted cook bots
- Display cook bot status in admin dashboard
- Capacity planning

---

### 3. Remove Cook Bot

Soft deletes a cook bot and handles its current order (if any).

**Endpoint:** `DELETE /api/cooks/:id`

**Path Parameters:**
- `id` (required, integer): Cook bot ID

**Success Response:** `200 OK`
```json
{
  "message": "Cook removed successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid cook ID format
  ```json
  {
    "error": "invalid cook id"
  }
  ```
- `404 Not Found` - Cook not found
  ```json
  {
    "error": "cook not found"
  }
  ```
- `500 Internal Server Error` - Server error
  ```json
  {
    "error": "failed to remove cook: <error details>"
  }
  ```

**Examples:**
```bash
# Remove cook bot with ID 5
curl -X DELETE http://localhost:8080/api/cooks/5

# Remove cook bot with ID 7
curl -X DELETE http://localhost:8080/api/cooks/7
```

**What Happens When Cook is Removed:**

1. **Cook Soft Deleted**: `deleted_at` timestamp is set
2. **Worker Stops**: Goroutine worker receives stop signal
3. **Current Order Handling**:
   - If cook is serving an order (status: SERVING)
   - Order status changes back to PENDING
   - Order is unassigned from cook
   - Order is returned to **front** of priority queue (#1 position)
4. **No New Orders**: Cook cannot accept new orders

**Business Impact:**
- Customer fairness: Order returns to front, not back of queue
- No order loss: All in-progress work is preserved
- Graceful degradation: System continues with remaining cooks

---

### 4. Reinstate Cook Bot

Reinstates a previously soft-deleted cook bot.

**Endpoint:** `POST /api/cooks/:id/reinstate`

**Path Parameters:**
- `id` (required, integer): Cook bot ID

**Success Response:** `200 OK`
```json
{
  "message": "Cook reinstated successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid cook ID or cook not deleted
  ```json
  {
    "error": "invalid cook id"
  }
  ```
  or
  ```json
  {
    "error": "cook is not deleted"
  }
  ```
- `404 Not Found` - Cook not found
  ```json
  {
    "error": "cook not found"
  }
  ```
- `500 Internal Server Error` - Server error
  ```json
  {
    "error": "failed to reinstate cook: <error details>"
  }
  ```

**Examples:**
```bash
# Reinstate cook bot with ID 5
curl -X POST http://localhost:8080/api/cooks/5/reinstate

# Reinstate cook bot with ID 7
curl -X POST http://localhost:8080/api/cooks/7/reinstate
```

**What Happens When Cook is Reinstated:**

1. **Cook Reactivated**: `deleted_at` is set to NULL
2. **Worker Restarts**: New goroutine worker is spawned (in worker pool implementations)
3. **Ready for Orders**: Cook can immediately accept new orders
4. **No Order Recovery**: Does not automatically resume previous orders

**Use Cases:**
- Recover from accidental deletions
- Dynamically scale worker pool up after scaling down
- Shift changes (remove/reinstate based on schedule)
- Maintenance recovery

---

### 5. Accept Order

Cook bot manually accepts the next order from the priority queue.

**Endpoint:** `POST /api/cooks/:id/accept`

**Path Parameters:**
- `id` (required, integer): Cook bot ID

**Success Response:** `200 OK`
```json
{
  "id": 10,
  "status": "SERVING",
  "assigned_cook_user": 5,
  "ordered_by": 2,
  "customer_name": "Regular Customer 1",
  "customer_role": "Regular Customer",
  "cook_name": "Cook Bot 1",
  "foods": [
    {
      "id": 1,
      "name": "Burger",
      "type": "Food",
      "created_at": "2025-10-24T14:00:00Z",
      "modified_at": "2025-10-24T14:00:00Z"
    }
  ],
  "created_at": "2025-10-24T14:30:45Z",
  "modified_at": "2025-10-24T14:31:00Z"
}
```

**Response Fields:**
Returns the full order object (same as Get Order by ID) with:
- Order now has status "SERVING"
- `assigned_cook_user` is set to the cook's ID
- `cook_name` is populated
- Full order details including customer and food items

**Error Responses:**
- `400 Bad Request` - Invalid cook ID
  ```json
  {
    "error": "invalid cook id"
  }
  ```
- `404 Not Found` - No orders in queue
  ```json
  {
    "error": "no orders in queue"
  }
  ```
- `500 Internal Server Error` - Server error (e.g., cook deleted, database error)
  ```json
  {
    "error": "cook is deleted"
  }
  ```
  or
  ```json
  {
    "error": "failed to accept order: <error details>"
  }
  ```

**Examples:**
```bash
# Cook 5 accepts next order
curl -X POST http://localhost:8080/api/cooks/5/accept

# Cook 6 accepts next order
curl -X POST http://localhost:8080/api/cooks/6/accept
```

**Priority Queue Selection:**

1. **VIP Priority**: Always dequeues VIP orders first
2. **FIFO**: Within priority level, oldest order is selected
3. **Automatic Processing**: Order processing begins (default: 10 seconds)
4. **Status Change**: Order changes from PENDING → SERVING

**Example Queue Scenario:**

```
Queue State:
  VIP: [Order 3, Order 7]
  Regular: [Order 1, Order 2, Order 4]

Cook accepts → Dequeues: Order 3 (VIP, oldest)

New Queue State:
  VIP: [Order 7]
  Regular: [Order 1, Order 2, Order 4]
```

---

## Cook Bot Lifecycle

```
┌─────────┐     Create Cook     ┌────────┐     Accept Order     ┌──────────┐
│ N/A     │ ─────────────────> │ ACTIVE │ ──────────────────> │ SERVING  │
└─────────┘                     └────────┘                      └──────────┘
                                    │ ▲                             │
                                    │ │ Reinstate                   │ Order Complete
                                    │ │                             │
                         Remove     │ └────────────┐                │
                                    ▼              │                ▼
                                ┌─────────┐       │            ┌────────┐
                                │ DELETED │───────┘            │ ACTIVE │
                                └─────────┘                    └────────┘
                                    │                               │
                                    │ Order Re-queued               │
                                    └───────────────────────────────┘
```

**State Descriptions:**

1. **ACTIVE** (not deleted)
   - Can accept orders
   - Worker goroutine running
   - Available in cook list

2. **SERVING** (processing order)
   - Cook has accepted an order
   - Order in progress
   - Cannot accept new orders until current order completes

3. **DELETED** (soft deleted)
   - Cannot accept orders
   - Worker stopped
   - Current order returned to queue
   - Can be reinstated

---

## Worker Pool Architecture

### Automatic Mode (Worker Pool)

In systems using the worker pool pattern:

- Each cook runs as an independent goroutine
- Continuously polls queue for orders
- Auto-accepts orders when available
- 100ms backoff when queue is empty
- Graceful shutdown with WaitGroups

### Manual Mode (Accept Endpoint)

Use the `/accept` endpoint for:

- Manual order assignment
- Testing scenarios
- Controlled processing
- Step-by-step workflows

---

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Create Cook | O(1) memory / O(log n) database | Simple insertion |
| List Cooks | O(n) | Must scan all cooks |
| Remove Cook | O(1) + O(queue) | Deletion + order re-queue |
| Reinstate Cook | O(1) | Update deleted_at field |
| Accept Order | O(1) | Queue dequeue operation |

---

## Business Rules

1. **Cook Creation**
   - Name is required
   - Role automatically set to "Cook"
   - Immediately available for work

2. **Cook Deletion**
   - Soft delete only (can be reinstated)
   - Current order returns to queue front
   - Worker goroutine stops gracefully
   - Cannot accept new orders

3. **Cook Reinstatement**
   - Only deleted cooks can be reinstated
   - Reactivates worker
   - No automatic order recovery

4. **Order Acceptance**
   - Cook must be active (not deleted)
   - Queue must have orders
   - VIP orders prioritized
   - FIFO within priority level

5. **Concurrency**
   - Thread-safe operations
   - Multiple cooks can work simultaneously
   - Race-condition free order assignment

---

## Scaling Strategies

### Scale Up (Add Cooks)

```bash
# Add 10 more cook bots
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/cooks \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Cook Bot $i\"}"
done
```

**When to Scale Up:**
- Queue size growing
- High order volume
- Low completion rate
- Customer wait times increasing

### Scale Down (Remove Cooks)

```bash
# Remove cook bots 10-15
for i in {10..15}; do
  curl -X DELETE http://localhost:8080/api/cooks/$i
done
```

**When to Scale Down:**
- Queue consistently empty
- Low order volume
- Over-capacity
- Cost optimization

### Dynamic Scaling Example

```bash
#!/bin/bash

# Get current queue size
QUEUE_SIZE=$(curl -s http://localhost:8080/api/orders/stats | jq '.queue_size')

# Scale up if queue > 100
if [ $QUEUE_SIZE -gt 100 ]; then
  echo "High load detected. Adding cook bot..."
  curl -X POST http://localhost:8080/api/cooks \
    -H "Content-Type: application/json" \
    -d '{"name": "Auto-scaled Cook"}'
fi

# Scale down if queue < 10
if [ $QUEUE_SIZE -lt 10 ]; then
  echo "Low load detected. Check for idle cooks to remove..."
fi
```

---

## Integration Examples

### JavaScript/Node.js

```javascript
// Create a cook bot
async function createCook(name) {
  const response = await fetch('http://localhost:8080/api/cooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    throw new Error(`Failed to create cook: ${response.statusText}`);
  }

  return await response.json();
}

// Get all active cooks
async function getActiveCooks() {
  const response = await fetch('http://localhost:8080/api/cooks');
  return await response.json();
}

// Remove cook
async function removeCook(cookId) {
  const response = await fetch(`http://localhost:8080/api/cooks/${cookId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`Failed to remove cook: ${response.statusText}`);
  }

  return await response.json();
}

// Reinstate cook
async function reinstateCook(cookId) {
  const response = await fetch(
    `http://localhost:8080/api/cooks/${cookId}/reinstate`,
    { method: 'POST' }
  );

  if (!response.ok) {
    throw new Error(`Failed to reinstate cook: ${response.statusText}`);
  }

  return await response.json();
}

// Accept order
async function acceptOrder(cookId) {
  const response = await fetch(
    `http://localhost:8080/api/cooks/${cookId}/accept`,
    { method: 'POST' }
  );

  if (!response.ok) {
    throw new Error(`Failed to accept order: ${response.statusText}`);
  }

  return await response.json();
}

// Usage
const cook = await createCook('Cook Bot Delta');
console.log(`Created cook ${cook.id}: ${cook.name}`);

const order = await acceptOrder(cook.id);
console.log(`Cook ${cook.id} accepted order ${order.id}`);
```

### Python

```python
import requests

BASE_URL = "http://localhost:8080"

def create_cook(name):
    response = requests.post(
        f"{BASE_URL}/api/cooks",
        json={"name": name}
    )
    response.raise_for_status()
    return response.json()

def get_cooks(include_deleted=False):
    params = {"include_deleted": include_deleted} if include_deleted else {}
    response = requests.get(f"{BASE_URL}/api/cooks", params=params)
    response.raise_for_status()
    return response.json()

def remove_cook(cook_id):
    response = requests.delete(f"{BASE_URL}/api/cooks/{cook_id}")
    response.raise_for_status()
    return response.json()

def reinstate_cook(cook_id):
    response = requests.post(f"{BASE_URL}/api/cooks/{cook_id}/reinstate")
    response.raise_for_status()
    return response.json()

def accept_order(cook_id):
    response = requests.post(f"{BASE_URL}/api/cooks/{cook_id}/accept")
    response.raise_for_status()
    return response.json()

# Usage
cook = create_cook("Cook Bot Gamma")
print(f"Created cook {cook['id']}: {cook['name']}")

order = accept_order(cook['id'])
print(f"Cook {cook['id']} accepted order {order['id']}")
```

---

## Monitoring and Logging

Cook bot operations are logged at the service layer:

```
[24/10/2025 - 14:30:45] [INFO] Cook Bot 5 created
[24/10/2025 - 14:31:00] [INFO] Order 1 accepted by cook Cook Bot 1 (ID: 5) - Queue size: 0
[24/10/2025 - 14:35:00] [INFO] Cook Bot 5 removed - Current order returned to queue
[24/10/2025 - 14:40:00] [INFO] Cook Bot 5 reinstated
```

**Recommended Metrics:**
- Active cook count
- Orders processed per cook
- Average processing time per cook
- Cook utilization rate
- Idle cook count
- Cook creation/deletion rate

---

## Error Handling

All errors follow a consistent JSON format:

```json
{
  "error": "descriptive error message"
}
```

### Common Error Scenarios

1. **Cook Not Found**: Invalid cook ID or cook doesn't exist
2. **Cook Already Deleted**: Attempting to remove already deleted cook
3. **Cook Not Deleted**: Attempting to reinstate active cook
4. **No Orders Available**: Queue is empty when accepting
5. **Invalid Name**: Empty or missing name when creating

---

## Related Documentation

- [Orders API](ORDERS_API.md) - Managing customer orders
- [Food API](FOOD_API.md) - Browsing available food items
- [Architecture Decisions](ARCHITECTURE.md) - Worker pool design
- [Examples](EXAMPLES.md) - Complete workflow examples
