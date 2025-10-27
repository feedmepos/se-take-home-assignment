# Food API Documentation

## Overview

The Food API provides endpoints for displaying food items in the McDonald's-style order kiosk system. This API allows customers to browse available menu items, filter by category, and view detailed information about specific food items.

## Architecture

The Food API follows a clean architecture with clear separation of concerns:

```
┌─────────────────┐
│ HTTP Controller │  ← Controller Layer (MVC pattern)
│(food_controller)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Food Service   │  ← Business Logic Layer
│ (food_service)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Food Repository │  ← Data Access Layer (Interface)
│   (interface)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Postgres│ │ In-Memory│  ← Concrete Implementations
│  Repo  │ │   Repo   │
└────────┘ └──────────┘
```

### Design Patterns Applied

1. **Repository Pattern**: Abstracts data access through interfaces
   - Interface: `internal/domain/repository.go`
   - PostgreSQL Implementation: `internal/infrastructure/postgres/food_repository.go`
   - In-Memory Implementation: `internal/infrastructure/memory/food_repository.go`

2. **Dependency Injection**: All dependencies injected via constructors
   - Service receives repository interface (not concrete implementation)
   - Controller receives service interface
   - Wired together in `cmd/api/main.go`

3. **SOLID Principles**:
   - **Single Responsibility**: Each layer has one clear purpose
   - **Open/Closed**: Extensible through interfaces (can swap implementations)
   - **Liskov Substitution**: Postgres/Memory repos are interchangeable
   - **Interface Segregation**: Small, focused interfaces
   - **Dependency Inversion**: Depend on abstractions, not concrete types

## API Endpoints

### Base URL
All Food API endpoints are under `/api/v1/foods`

### 1. Get All Food Items

**Endpoint:** `GET /api/v1/foods`

**Description:** Retrieves all non-deleted food items. Supports optional filtering by food type.

**Query Parameters:**
- `type` (optional): Filter by food type
  - Valid values: `Food`, `Drink`, `Dessert`
  - Case-sensitive

**Success Response (200 OK):**
```json
{
  "foods": [
    {
      "id": 1,
      "name": "Big Mac",
      "type": "Food",
      "created_at": "2025-01-15T10:00:00Z",
      "modified_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "name": "McFlurry",
      "type": "Dessert",
      "created_at": "2025-01-15T10:00:00Z",
      "modified_at": "2025-01-15T10:00:00Z"
    }
  ],
  "count": 2
}
```

**Success Response with Type Filter (200 OK):**
```json
{
  "foods": [
    {
      "id": 1,
      "name": "Big Mac",
      "type": "Food",
      "created_at": "2025-01-15T10:00:00Z",
      "modified_at": "2025-01-15T10:00:00Z"
    }
  ],
  "count": 1,
  "type": "Food"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid food type parameter
  ```json
  {
    "error": "invalid food type. Must be one of: Food, Drink, Dessert"
  }
  ```
- `500 Internal Server Error`: Database or server error
  ```json
  {
    "error": "failed to retrieve foods: <error details>"
  }
  ```

**Examples:**
```bash
# Get all food items
curl http://localhost:8080/api/v1/foods

# Get only food items (burgers, sandwiches, etc.)
curl http://localhost:8080/api/v1/foods?type=Food

# Get only drinks
curl http://localhost:8080/api/v1/foods?type=Drink

# Get only desserts
curl http://localhost:8080/api/v1/foods?type=Dessert
```

---

### 2. Get Food Item by ID

**Endpoint:** `GET /api/v1/foods/:id`

**Description:** Retrieves a specific food item by its ID. Returns 404 if the item doesn't exist or has been soft-deleted.

**Path Parameters:**
- `id` (required): Food item ID (positive integer)

**Success Response (200 OK):**
```json
{
  "id": 1,
  "name": "Big Mac",
  "type": "Food",
  "created_at": "2025-01-15T10:00:00Z",
  "modified_at": "2025-01-15T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid ID parameter
  ```json
  {
    "error": "invalid food id: must be a positive integer"
  }
  ```
- `404 Not Found`: Food item not found or deleted
  ```json
  {
    "error": "food not found"
  }
  ```
  or
  ```json
  {
    "error": "food item is no longer available"
  }
  ```
- `500 Internal Server Error`: Database or server error

**Examples:**
```bash
# Get food item with ID 1
curl http://localhost:8080/api/v1/foods/1

# Get food item with ID 5
curl http://localhost:8080/api/v1/foods/5
```

---

## Business Rules

1. **Soft Delete Awareness**: Only non-deleted food items are returned
   - Items with `deleted_at != NULL` are filtered out
   - Attempting to retrieve a deleted item by ID returns 404

2. **Type Validation**: Only valid food types are accepted
   - Valid types: `Food`, `Drink`, `Dessert`
   - Type filtering is case-sensitive

3. **Read-Only Operations**: This API only provides read operations
   - No create, update, or delete operations for kiosk customers
   - Food management should be done through admin endpoints (not part of this API)

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| GetAll | O(n) | Must iterate through all food items |
| GetByType | O(n) | Must scan and filter all items |
| GetByID | O(1) memory / O(log n) database | Map lookup or indexed query |

### Space Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| GetAll | O(n) | Returns array of all items |
| GetByType | O(k) | Returns array of k filtered items |
| GetByID | O(1) | Returns single item |

## Implementation Files

### Domain Layer
- **`internal/domain/food.go`**: Food entity with FoodType constants
- **`internal/domain/repository.go`**: FoodRepository interface definition

### Service Layer
- **`internal/service/food_service.go`**: Business logic for food operations
  - `FoodService` interface
  - `foodService` implementation with validation and logging

### Controller Layer
- **`internal/controller/food_controller.go`**: HTTP controllers (MVC pattern)
  - Request parsing and validation
  - Response formatting
  - Error handling

### Repository Layer (Infrastructure)
- **`internal/infrastructure/postgres/food_repository.go`**: PostgreSQL implementation
  - SQL queries with proper WHERE clauses for filtering
  - Soft delete awareness (WHERE deleted_at IS NULL)

- **`internal/infrastructure/memory/food_repository.go`**: In-memory implementation
  - Thread-safe with sync.RWMutex
  - Map-based O(1) lookups
  - Manual filtering for type queries

### Wiring (Main Application)
- **`cmd/api/main.go`**: Dependency injection and route setup
  - Creates FoodService with injected repository
  - Creates FoodController with injected service
  - Registers routes under `/api/v1/foods`

## Testing Recommendations

### Unit Tests
1. **Service Layer Tests** (`food_service_test.go`)
   - Mock the FoodRepository interface
   - Test business logic validation
   - Test error handling

2. **Controller Layer Tests** (`food_controller_test.go`)
   - Mock the FoodService interface
   - Test HTTP request/response handling
   - Test query parameter parsing

### Integration Tests
1. Test with actual PostgreSQL database
2. Test with in-memory repository
3. Verify soft delete filtering works correctly

### Example Test Cases
- Get all foods returns non-deleted items only
- Get by type filters correctly for each type (Food, Drink, Dessert)
- Get by type rejects invalid types
- Get by ID returns 404 for deleted items
- Get by ID validates positive integers
- Concurrent requests are handled safely (in-memory repo)

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "descriptive error message"
}
```

Errors are logged at the service layer for debugging and monitoring.

## Future Enhancements

Potential improvements for consideration:

1. **Pagination**: For large food catalogs
   ```
   GET /api/v1/foods?type=Food&page=1&limit=20
   ```

2. **Sorting**: Allow sorting by name, type, or creation date
   ```
   GET /api/v1/foods?sort=name&order=asc
   ```

3. **Search**: Full-text search by name
   ```
   GET /api/v1/foods?search=burger
   ```

4. **Caching**: Cache frequently accessed food lists
   - In-memory cache with TTL
   - Redis for distributed systems

5. **Price Information**: Add price field to Food entity
   - Display prices on kiosk
   - Support for promotional pricing

6. **Images**: Add image URLs for food items
   - Display food photos on kiosk
   - Multiple images per item

7. **Availability Status**: Real-time item availability
   - Mark items as out-of-stock
   - Auto-filter unavailable items

## Security Considerations

1. **Input Validation**: All user inputs are validated
   - ID parameter: must be positive integer
   - Type parameter: must match predefined constants

2. **SQL Injection Prevention**: Using parameterized queries
   - PostgreSQL implementation uses `$1`, `$2` placeholders
   - Database driver handles escaping

3. **No Sensitive Data**: Food items contain no sensitive information
   - Safe for public API access
   - No authentication required for read operations

## Monitoring and Observability

All operations are logged at the service layer:

```go
s.logger.Info("Retrieved %d food items", len(foods))
s.logger.Error("Failed to retrieve food with ID %d: %v", id, err)
```

Recommended metrics to track:
- Request count by endpoint
- Response times (p50, p95, p99)
- Error rates
- Most frequently requested food types
- Most viewed food items

## Example Integration (Frontend)

```javascript
// Fetch all food items
async function getAllFoods() {
  const response = await fetch('http://localhost:8080/api/v1/foods');
  const data = await response.json();
  return data.foods;
}

// Fetch foods by type
async function getFoodsByType(type) {
  const response = await fetch(`http://localhost:8080/api/v1/foods?type=${type}`);
  const data = await response.json();
  return data.foods;
}

// Fetch specific food item
async function getFoodById(id) {
  const response = await fetch(`http://localhost:8080/api/v1/foods/${id}`);
  if (!response.ok) {
    throw new Error('Food item not found');
  }
  return await response.json();
}

// Usage in kiosk UI
const foods = await getFoodsByType('Food');
const drinks = await getFoodsByType('Drink');
const desserts = await getFoodsByType('Dessert');
```

## Database Schema

The Food API relies on the following database schema:

```sql
CREATE TABLE food (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Food', 'Drink', 'Dessert')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Index for type filtering (improves O(n) query performance)
CREATE INDEX idx_food_type ON food(type) WHERE deleted_at IS NULL;

-- Index for non-deleted items
CREATE INDEX idx_food_active ON food(deleted_at) WHERE deleted_at IS NULL;
```

## Conclusion

The Food API provides a clean, well-architected solution for displaying food items in the kiosk system. It follows best practices in software design, ensuring maintainability, testability, and scalability. The implementation adheres to SOLID principles and leverages proper separation of concerns through the repository pattern and dependency injection.
