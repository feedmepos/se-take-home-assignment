# Orders API Documentation

## Overview

The Orders API provides endpoints for creating and managing customer orders in the McMocknald Order Kiosk system. Orders are automatically prioritized based on customer type (VIP vs Regular) and processed by available cook bots.

## Base URL

All Orders API endpoints are under `/api/orders`

---

## Endpoints

### 1. Create Order

Creates a new order for a customer (Regular or VIP).

**Endpoint:** `POST /api/orders`

**Request Body:**
```json
{
  "customer_id": 1,
  "food_ids": [1, 2, 3]
}
```

**Parameters:**
- `customer_id` (required, integer): The ID of the customer placing the order
- `food_ids` (required, array of integers): Array of food item IDs to include in the order

**Success Response:** `201 Created`
```json
{
  "id": 1,
  "status": "PENDING",
  "assigned_cook_user": null,
  "ordered_by": 1,
  "customer_name": "VIP Customer 1",
  "customer_role": "VIP Customer",
  "created_at": "2025-10-24T14:30:45Z",
  "modified_at": "2025-10-24T14:30:45Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request body or missing required fields
  ```json
  {
    "error": "invalid request body"
  }
  ```
- `404 Not Found` - Customer not found or food items not found
  ```json
  {
    "error": "customer not found"
  }
  ```
- `500 Internal Server Error` - Server error
  ```json
  {
    "error": "failed to create order: <error details>"
  }
  ```

**Examples:**
```bash
# Create order for VIP customer
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 3,
    "food_ids": [1, 2, 4]
  }'

# Create order for Regular customer
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "food_ids": [3, 6]
  }'
```

**Business Rules:**
- Order is automatically enqueued based on customer type (VIP orders go to VIP queue)
- Order starts with `PENDING` status
- No assigned cook until a cook bot accepts the order
- Food IDs must exist in the system
- Customer must exist and be active (not deleted)

---

### 2. Get Order by ID

Retrieves detailed information about a specific order.

**Endpoint:** `GET /api/orders/:id`

**Path Parameters:**
- `id` (required, integer): Order ID

**Success Response:** `200 OK`
```json
{
  "id": 1,
  "status": "SERVING",
  "assigned_cook_user": 5,
  "ordered_by": 1,
  "customer_name": "VIP Customer 1",
  "customer_role": "VIP Customer",
  "cook_name": "Cook Bot 1",
  "foods": [
    {
      "id": 1,
      "name": "Burger",
      "type": "Food",
      "created_at": "2025-10-24T14:00:00Z",
      "modified_at": "2025-10-24T14:00:00Z"
    },
    {
      "id": 2,
      "name": "Fries",
      "type": "Food",
      "created_at": "2025-10-24T14:00:00Z",
      "modified_at": "2025-10-24T14:00:00Z"
    }
  ],
  "created_at": "2025-10-24T14:30:45Z",
  "modified_at": "2025-10-24T14:30:50Z"
}
```

**Response Fields:**
- `id`: Order unique identifier
- `status`: Current order status (PENDING, SERVING, or COMPLETE)
- `assigned_cook_user`: ID of cook bot handling the order (null if PENDING)
- `ordered_by`: Customer ID who placed the order
- `customer_name`: Full name of the customer
- `customer_role`: Customer role (Regular Customer or VIP Customer)
- `cook_name`: Name of assigned cook bot (only present if assigned)
- `foods`: Array of food items in the order
- `created_at`: Timestamp when order was created
- `modified_at`: Timestamp when order was last updated

**Error Responses:**
- `400 Bad Request` - Invalid order ID format
  ```json
  {
    "error": "invalid order id"
  }
  ```
- `404 Not Found` - Order not found
  ```json
  {
    "error": "order not found"
  }
  ```
- `500 Internal Server Error` - Server error

**Examples:**
```bash
# Get order details
curl http://localhost:8080/api/orders/1

# Get order with specific ID
curl http://localhost:8080/api/orders/42
```

---

### 3. Get Order Statistics

Retrieves system-wide order completion statistics.

**Endpoint:** `GET /api/orders/stats`

**Success Response:** `200 OK`
```json
{
  "completed": 150,
  "incomplete": 45,
  "queue_size": 30
}
```

**Response Fields:**
- `completed`: Number of orders with status COMPLETE
- `incomplete`: Number of orders with status PENDING or SERVING
- `queue_size`: Number of orders currently waiting in the priority queue (PENDING only)

**Error Responses:**
- `500 Internal Server Error` - Server error
  ```json
  {
    "error": "failed to retrieve order statistics"
  }
  ```

**Examples:**
```bash
# Get current statistics
curl http://localhost:8080/api/orders/stats
```

**Use Cases:**
- Monitor system load and queue backlog
- Track completion rates
- Dashboard metrics
- Performance monitoring
- Capacity planning

---

## Order Status Flow

Orders progress through the following states:

```
┌─────────┐     Cook Accepts     ┌─────────┐     10s Processing     ┌──────────┐
│ PENDING │ ───────────────────> │ SERVING │ ────────────────────> │ COMPLETE │
└─────────┘                      └─────────┘                        └──────────┘
     │                                │
     │                                │ Cook Removed
     │                                │
     └────────────────────────────────┘
            (Returns to queue front)
```

**State Descriptions:**

1. **PENDING**
   - Order created and added to priority queue
   - Waiting for cook bot to accept
   - No assigned cook
   - Position in queue based on customer type (VIP > Regular)

2. **SERVING**
   - Accepted by a cook bot
   - Being processed (default: 10 seconds)
   - Assigned cook ID present
   - If cook is removed, order returns to PENDING at queue front

3. **COMPLETE**
   - Successfully processed and served
   - Final state (terminal)
   - No further state changes

---

## Priority Queue Behavior

### Queue Rules

1. **VIP Priority**: VIP customer orders always processed before Regular customer orders
2. **FIFO Within Priority**: Orders within the same priority level are processed in order of creation
3. **Queue Front Re-entry**: When a cook is removed, their order returns to position #1 in their priority queue

### Example Scenario

```
Initial Queue:
  VIP Queue: [Order 1, Order 3, Order 5]
  Regular Queue: [Order 2, Order 4, Order 6]

Processing Order: VIP Order 1 → Next: VIP Order 3

If cook handling Order 1 is removed:
  VIP Queue: [Order 1, Order 3, Order 5]  ← Order 1 back at front
  Regular Queue: [Order 2, Order 4, Order 6]
```

---

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Create Order | O(1) memory / O(log n) database | Queue enqueue is O(1) |
| Get Order | O(1) memory / O(log n) database | Direct lookup |
| Get Stats | O(n) | Must count all orders |
| Queue Operations | O(1) | Optimized dual-slice implementation |

---

## Business Rules

1. **Customer Validation**
   - Customer must exist in the system
   - Customer must not be soft-deleted
   - Customer role determines queue priority

2. **Food Validation**
   - All food IDs must exist
   - Food items must not be soft-deleted
   - At least one food item required

3. **Order Lifecycle**
   - Orders cannot be canceled once created
   - Orders cannot skip states (must go PENDING → SERVING → COMPLETE)
   - Completed orders are immutable

4. **Concurrency**
   - Multiple orders can be created simultaneously
   - Thread-safe queue operations
   - Race-condition free cook assignment

---

## Integration Examples

### JavaScript/Node.js

```javascript
// Create an order
async function createOrder(customerId, foodIds) {
  const response = await fetch('http://localhost:8080/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: customerId,
      food_ids: foodIds
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create order: ${response.statusText}`);
  }

  return await response.json();
}

// Get order details
async function getOrder(orderId) {
  const response = await fetch(`http://localhost:8080/api/orders/${orderId}`);

  if (!response.ok) {
    throw new Error(`Order not found: ${orderId}`);
  }

  return await response.json();
}

// Get statistics
async function getOrderStats() {
  const response = await fetch('http://localhost:8080/api/orders/stats');
  return await response.json();
}

// Usage
const order = await createOrder(3, [1, 2, 4]);
console.log(`Order ${order.id} created with status ${order.status}`);

const stats = await getOrderStats();
console.log(`Queue size: ${stats.queue_size}, Completed: ${stats.completed}`);
```

### Python

```python
import requests

BASE_URL = "http://localhost:8080"

def create_order(customer_id, food_ids):
    response = requests.post(
        f"{BASE_URL}/api/orders",
        json={"customer_id": customer_id, "food_ids": food_ids}
    )
    response.raise_for_status()
    return response.json()

def get_order(order_id):
    response = requests.get(f"{BASE_URL}/api/orders/{order_id}")
    response.raise_for_status()
    return response.json()

def get_order_stats():
    response = requests.get(f"{BASE_URL}/api/orders/stats")
    response.raise_for_status()
    return response.json()

# Usage
order = create_order(customer_id=3, food_ids=[1, 2, 4])
print(f"Order {order['id']} created with status {order['status']}")

stats = get_order_stats()
print(f"Queue size: {stats['queue_size']}, Completed: {stats['completed']}")
```

---

## Error Handling

All errors follow a consistent JSON format:

```json
{
  "error": "descriptive error message"
}
```

### Common Error Scenarios

1. **Invalid Customer**: Customer ID doesn't exist or is deleted
2. **Invalid Food Items**: One or more food IDs don't exist
3. **Empty Food List**: No food items provided in request
4. **Invalid Order ID**: Order not found or invalid ID format
5. **System Error**: Database connection issues or internal errors

---

## Monitoring and Logging

All order operations are logged at the service layer:

```
[24/10/2025 - 14:30:45] [INFO] Order 1 created by customer VIP Customer 1 (VIP Customer) - Queue size: 1
[24/10/2025 - 14:30:46] [INFO] Order 1 accepted by cook Cook Bot 1 (ID: 5) - Queue size: 0
[24/10/2025 - 14:30:56] [INFO] Order 1 completed by cook 5
```

**Recommended Metrics:**
- Orders created per minute
- Average queue wait time
- Completion rate
- Orders by customer type (VIP vs Regular)
- Peak queue size
- Processing time per order

---

## Related Documentation

- [Cook Bots API](COOKS_API.md) - Managing cook bots
- [Food API](FOOD_API.md) - Browsing available food items
- [Architecture Decisions](ARCHITECTURE.md) - Design decisions and trade-offs
- [Examples](EXAMPLES.md) - Complete workflow examples
