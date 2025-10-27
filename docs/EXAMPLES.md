# McMocknald Order Kiosk - Usage Examples

> **Quick Links:** [API Overview](API.md) | [Orders API](ORDERS_API.md) | [Cook Bots API](COOKS_API.md) | [Food API](FOOD_API.md) | [Architecture](ARCHITECTURE.md)

## Starting the Application

### Memory Mode (Fastest for Testing)
```bash
MODE=memory go run cmd/api/main.go
```

### Database Mode (Production)
```bash
# 1. Start PostgreSQL
docker-compose up -d

# 2. Verify PostgreSQL is running
docker ps

# 3. Run migrations
psql -h localhost -p 7001 -U postgres -d mcmocknald -f migrations/001_create_schema.sql

# 4. Start application
MODE=database go run cmd/api/main.go
```

## API Examples

### 1. Health Check
```bash
curl http://localhost:8080/health
```

**Expected Response:**
```json
{"status":"ok"}
```

---

### 2. Create Regular Customer
```bash
curl -X POST http://localhost:8080/api/cooks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Regular Customer 1"
  }'
```

Note: In production, you'd create customers through admin endpoints or database.

---

### 3. Create VIP Customer
```bash
curl -X POST http://localhost:8080/api/cooks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VIP Customer 1"
  }'
```

---

### 4. Create Cook Bot
```bash
curl -X POST http://localhost:8080/api/cooks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cook Bot Alpha"
  }'
```

**Expected Response:**
```json
{
  "id": 6,
  "name": "Cook Bot Alpha",
  "role": "Cook",
  "created_at": "2025-10-24T14:30:45Z",
  "modified_at": "2025-10-24T14:30:45Z"
}
```

---

### 5. List All Cook Bots
```bash
curl http://localhost:8080/api/cooks
```

**Expected Response:**
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
    "name": "Cook Bot Alpha",
    "role": "Cook",
    "created_at": "2025-10-24T14:30:45Z",
    "modified_at": "2025-10-24T14:30:45Z"
  }
]
```

---

### 6. Create Order (VIP Customer)

Assuming:
- Customer ID: 3 (VIP Customer 1 from migrations)
- Food IDs: 1, 2, 4 (Burger, Fries, Soda)

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 3,
    "food_ids": [1, 2, 4]
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "status": "PENDING",
  "assigned_cook_user": null,
  "ordered_by": 3,
  "customer_name": "VIP Customer 1",
  "customer_role": "VIP Customer",
  "created_at": "2025-10-24T14:35:00Z",
  "modified_at": "2025-10-24T14:35:00Z"
}
```

---

### 7. Create Order (Regular Customer)

Assuming:
- Customer ID: 1 (Regular Customer 1 from migrations)
- Food IDs: 3, 6 (Pizza, Ice Cream)

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "food_ids": [3, 6]
  }'
```

**Expected Response:**
```json
{
  "id": 2,
  "status": "PENDING",
  "assigned_cook_user": null,
  "ordered_by": 1,
  "customer_name": "Regular Customer 1",
  "customer_role": "Regular Customer",
  "created_at": "2025-10-24T14:35:05Z",
  "modified_at": "2025-10-24T14:35:05Z"
}
```

---

### 8. Cook Accepts Order

Cook ID: 5 (Cook Bot 1)

```bash
curl -X POST http://localhost:8080/api/cooks/5/accept
```

**Expected Response:**
```json
{
  "id": 1,
  "status": "SERVING",
  "assigned_cook_user": 5,
  "ordered_by": 3,
  "customer_name": "VIP Customer 1",
  "customer_role": "VIP Customer",
  "cook_name": "Cook Bot 1",
  "created_at": "2025-10-24T14:35:00Z",
  "modified_at": "2025-10-24T14:35:10Z"
}
```

Note: VIP order (ID 1) is served before Regular order (ID 2) due to priority queue.

---

### 9. Get Order Details

Order ID: 1

```bash
curl http://localhost:8080/api/orders/1
```

**Expected Response:**
```json
{
  "id": 1,
  "status": "SERVING",
  "assigned_cook_user": 5,
  "ordered_by": 3,
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
    },
    {
      "id": 4,
      "name": "Soda",
      "type": "Drink",
      "created_at": "2025-10-24T14:00:00Z",
      "modified_at": "2025-10-24T14:00:00Z"
    }
  ],
  "created_at": "2025-10-24T14:35:00Z",
  "modified_at": "2025-10-24T14:35:10Z"
}
```

---

### 10. Get Order Statistics

```bash
curl http://localhost:8080/api/orders/stats
```

**Expected Response:**
```json
{
  "completed": 5,
  "incomplete": 12,
  "queue_size": 10
}
```

- **completed**: Orders with status COMPLETE
- **incomplete**: Orders with status PENDING or SERVING
- **queue_size**: Orders waiting in queue (PENDING only)

---

### 11. Remove Cook Bot (Soft Delete)

Cook ID: 5

```bash
curl -X DELETE http://localhost:8080/api/cooks/5
```

**Expected Response:**
```json
{
  "message": "Cook removed successfully"
}
```

**What Happens:**
- Cook Bot 5 is soft deleted (deleted_at timestamp set)
- Any order being served by Cook Bot 5 is:
  - Status changed back to PENDING
  - Unassigned from cook
  - Returned to FRONT of queue (#1 position in their priority level)

---

### 12. Reinstate Cook Bot

Cook ID: 5

```bash
curl -X POST http://localhost:8080/api/cooks/5/reinstate
```

**Expected Response:**
```json
{
  "message": "Cook reinstated successfully"
}
```

**What Happens:**
- Cook Bot 5's deleted_at is cleared (set to NULL)
- Cook is active again and can accept orders

---

### 13. List Cooks Including Deleted

```bash
curl "http://localhost:8080/api/cooks?include_deleted=true"
```

**Expected Response:**
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
    "name": "Cook Bot Alpha",
    "role": "Cook",
    "created_at": "2025-10-24T14:30:45Z",
    "modified_at": "2025-10-24T14:30:45Z"
  }
]
```

---

## Complete Workflow Example

### Scenario: Lunch Rush with Multiple Orders

```bash
# 1. Create 3 cook bots
for i in {1..3}; do
  curl -X POST http://localhost:8080/api/cooks \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Cook Bot $i\"}"
done

# 2. Create 5 VIP orders
for i in {1..5}; do
  curl -X POST http://localhost:8080/api/orders \
    -H "Content-Type: application/json" \
    -d '{"customer_id": 3, "food_ids": [1, 2, 4]}'
done

# 3. Create 10 Regular orders
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/orders \
    -H "Content-Type: application/json" \
    -d '{"customer_id": 1, "food_ids": [3, 6]}'
done

# 4. Check queue size
curl http://localhost:8080/api/orders/stats

# 5. Cooks start accepting orders (VIP first!)
curl -X POST http://localhost:8080/api/cooks/5/accept
curl -X POST http://localhost:8080/api/cooks/6/accept
curl -X POST http://localhost:8080/api/cooks/7/accept

# 6. Wait 10 seconds for orders to complete
sleep 10

# 7. Check statistics again
curl http://localhost:8080/api/orders/stats

# 8. Remove one cook during rush
curl -X DELETE http://localhost:8080/api/cooks/5

# 9. Check queue (order returned to front)
curl http://localhost:8080/api/orders/stats

# 10. Reinstate cook
curl -X POST http://localhost:8080/api/cooks/5/reinstate
```

---

## Testing Scenarios

### Test Scenario 1: Small Scale
```bash
cd /path/to/project
go test -v -run TestScenario1 ./internal/service -timeout 5m
```

**What it tests:**
- 100 Regular customers
- 50 VIP customers
- 25 cook bots
- 1 order per customer per second
- Duration: 3 minutes
- Reports every 20 seconds

**Expected Output:**
```
=== RUN   TestScenario1
[20s] Completed: 245, Incomplete: 2755, Queue: 2500
[40s] Completed: 590, Incomplete: 5410, Queue: 5000
[60s] Completed: 935, Incomplete: 8065, Queue: 7500
[80s] Completed: 1280, Incomplete: 10720, Queue: 10000
[100s] Completed: 1625, Incomplete: 13375, Queue: 12500
[120s] Completed: 1970, Incomplete: 16030, Queue: 15000
[140s] Completed: 2315, Incomplete: 18685, Queue: 17500
[160s] Completed: 2660, Incomplete: 21340, Queue: 20000

=== Test Scenario 1 Results ===
Regular Customers: 100
VIP Customers: 50
Cook Bots: 25
Test Duration: 3m0s
Final Completed: 2850
Final Incomplete: 24150
Completion Rate: 10.56%
--- PASS: TestScenario1 (192.28s)
```

---

### Test Scenario 2: Large Scale
```bash
go test -v -run TestScenario2 ./internal/service -timeout 10m
```

**What it tests:**
- 10,000 Regular customers
- 5,000 VIP customers
- 1,250 cook bots
- 1 order per customer per second
- Duration: 3 minutes
- Reports every 20 seconds

**Performance Note:** This test demonstrates the system can handle millions of orders.

---

## Performance Testing

### Benchmark Queue Operations
```bash
go test -bench=. -benchmem ./pkg/queue
```

### Load Test with Apache Bench
```bash
# Create 1000 orders concurrently
ab -n 1000 -c 100 -p order.json -T application/json \
  http://localhost:8080/api/orders
```

Where `order.json`:
```json
{
  "customer_id": 3,
  "food_ids": [1, 2]
}
```

---

## Monitoring Logs

### View Real-time Logs
```bash
tail -f logs/orders-$(date +%d-%m-%Y).log
```

### Sample Log Output
```
[24/10/2025 - 14:35:00] [INFO] Order 1 created by customer VIP Customer 1 (VIP Customer) - Queue size: 1
[24/10/2025 - 14:35:05] [INFO] Order 2 created by customer Regular Customer 1 (Regular Customer) - Queue size: 2
[24/10/2025 - 14:35:10] [INFO] Order 1 accepted by cook Cook Bot 1 (ID: 5) - Queue size: 1
[24/10/2025 - 14:35:20] [INFO] Order 1 completed by cook 5
[24/10/2025 - 14:35:21] [INFO] Order 2 accepted by cook Cook Bot 1 (ID: 5) - Queue size: 0
[24/10/2025 - 14:35:31] [INFO] Order 2 completed by cook 5
```

---

## Database Queries (PostgreSQL Mode)

### Connect to Database
```bash
psql -h localhost -p 7001 -U postgres -d mcmocknald
```

### Useful Queries

**Count orders by status:**
```sql
SELECT status, COUNT(*)
FROM "order"
WHERE deleted_at IS NULL
GROUP BY status;
```

**List VIP orders in queue:**
```sql
SELECT o.id, o.status, u.name, u.role
FROM "order" o
JOIN "user" u ON o.ordered_by = u.id
WHERE o.status = 'PENDING'
  AND u.role = 'VIP Customer'
  AND o.deleted_at IS NULL
ORDER BY o.created_at;
```

**Find busy cooks:**
```sql
SELECT
  u.id,
  u.name,
  COUNT(o.id) as active_orders
FROM "user" u
LEFT JOIN "order" o ON u.id = o.assigned_cook_user
  AND o.status = 'SERVING'
WHERE u.role = 'Cook'
  AND u.deleted_at IS NULL
GROUP BY u.id, u.name
ORDER BY active_orders DESC;
```

**Order completion statistics:**
```sql
SELECT
  DATE(created_at) as order_date,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'COMPLETE' THEN 1 END) as completed,
  COUNT(CASE WHEN status != 'COMPLETE' THEN 1 END) as incomplete,
  ROUND(COUNT(CASE WHEN status = 'COMPLETE' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as completion_rate
FROM "order"
WHERE deleted_at IS NULL
GROUP BY DATE(created_at)
ORDER BY order_date DESC;
```

---

## Troubleshooting

### Issue: "No orders in queue"
```bash
# Check queue size
curl http://localhost:8080/api/orders/stats

# Create more orders
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "food_ids": [1]}'
```

### Issue: "Cook is deleted"
```bash
# List cooks including deleted
curl "http://localhost:8080/api/cooks?include_deleted=true"

# Reinstate cook
curl -X POST http://localhost:8080/api/cooks/5/reinstate
```

### Issue: Database connection failed
```bash
# Check PostgreSQL is running
docker ps

# Check connection
psql -h localhost -p 7001 -U postgres -d mcmocknald

# Restart database
docker-compose restart
```

---

## Tips and Best Practices

1. **VIP Priority**: VIP orders are always served first. If you create 100 Regular orders and then 1 VIP order, the VIP order will be served next.

2. **Cook Removal**: When a cook is removed, their current order goes to the FRONT of the queue, not the back. This ensures fairness.

3. **Order Serving Time**: Default is 10 seconds. Change via ORDER_SERVING_DURATION env var (e.g., "5s", "1m").

4. **Logging**: Check logs directory for detailed operation logs with daily rotation.

5. **Testing**: Use memory mode for fast testing. Use database mode to verify persistence.

6. **Scaling**: Add more cook bots to increase throughput. Each cook processes one order every 10 seconds.

---

## Related Documentation

For detailed API specifications and architecture information, please refer to:

- **[API Overview](API.md)** - Complete API documentation with all endpoints
- **[Orders API](ORDERS_API.md)** - Detailed orders endpoint documentation
- **[Cook Bots API](COOKS_API.md)** - Detailed cook bots endpoint documentation
- **[Food API](FOOD_API.md)** - Detailed food catalog endpoint documentation
- **[Architecture Decisions](ARCHITECTURE.md)** - Design patterns and trade-offs
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Complete technical overview

---

This completes the usage examples for the McMocknald Order Kiosk system!
