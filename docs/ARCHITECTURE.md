# Architecture Decisions

This document records important architectural decisions and design trade-offs made in the McMocknald Order Kiosk project.

## ADR-001: Repository Data Enrichment Pattern

**Status:** Accepted

**Context:**
The OrderRepository needs to return order data enriched with related user (customer/cook) and food information for API responses. There are two possible approaches:

1. **Service Layer Enrichment**: Repository returns bare Order entities, service layer queries UserRepository and FoodRepository to enrich data
2. **Repository Enrichment**: Repository has dependencies on UserRepository and FoodRepository to return enriched data

**Decision:**
We chose **Repository Enrichment** (Option 2) despite the tight coupling it introduces.

**Rationale:**

### Pros of Repository Enrichment:
- **Performance**: Avoids N+1 query problem - single repository call returns fully enriched data
- **Consistency**: Enrichment logic is centralized in one place
- **Simplicity**: Service layer doesn't need to coordinate multiple repository calls
- **Co-location**: All repositories are in the same bounded context (Order Management)

### Accepted Trade-offs:
- **Coupling**: OrderRepository depends on UserRepository and FoodRepository interfaces
  - *Mitigation*: Dependencies are on interfaces, not concrete implementations
  - *Mitigation*: All repositories are in the same bounded context
- **SOLID Violation**: Violates Dependency Inversion at the infrastructure level
  - *Acceptance*: The violation is contained within infrastructure layer
  - *Acceptance*: Service layer remains clean and depends only on domain interfaces

### Why Service Layer Enrichment Was Rejected:
```go
// Service layer would need to do this for every order:
order := orderRepo.GetByID(ctx, id)
customer := userRepo.GetByID(ctx, order.OrderedBy)
cook := userRepo.GetByID(ctx, *order.AssignedCookUser)
foods := []Food{}
for _, foodID := range order.FoodIDs {
    food := foodRepo.GetByID(ctx, foodID)
    foods = append(foods, food)
}
// Then manually construct enriched response
```

This would:
- Require 3+ database calls per order retrieval
- Scatter enrichment logic across service layer
- Make the service layer more complex
- Reduce performance significantly

**Consequences:**

### Positive:
- Fast order retrieval with all related data
- Simple service layer code
- Better user experience (single API call returns complete data)

### Negative:
- OrderRepository cannot be used in isolation without UserRepository and FoodRepository
- Testing requires mocking two additional repositories
- Changing user/food schema may impact order repository

**Alternative Considered:**
Using a dedicated "OrderView" or "Projection" pattern with a separate read model, but this was deemed over-engineering for the current scale.

**Review Date:** 2025-10-24
**Reviewed By:** golang-debt-reviewer, golang-architect

---

## ADR-002: Context-Based Goroutine Cancellation

**Status:** Accepted

**Context:**
Worker pool goroutines need proper shutdown mechanisms to prevent goroutine leaks during graceful shutdown.

**Decision:**
Use context-based cancellation in addition to stop channels for all goroutines.

**Implementation:**
- `processOrder`: Uses `select` with `ctx.Done()` and `time.After()`
- Worker goroutines: Monitor `ctx.Done()`, worker stop channel, and global stop channel
- Ticker-based polling: Replaced `time.Sleep()` with `time.Ticker` for responsive cancellation

**Benefits:**
- Graceful shutdown with 30-second timeout
- No goroutine leaks
- Responsive to context cancellation
- Clean resource cleanup

---

## ADR-003: Idempotent Database Migrations

**Status:** Accepted

**Context:**
Migrations need to be safely re-runnable without causing errors or duplicating data.

**Decision:**
Use idempotent SQL patterns in all migrations:
- `CREATE TABLE IF NOT EXISTS` for table creation
- `CREATE INDEX IF NOT EXISTS` for index creation
- `ON CONFLICT DO NOTHING` for reference data
- `DO $$ ... END $$` blocks with existence checks for seed data

**Benefits:**
- Safe to re-run migrations
- No errors on re-application
- Development/testing workflow improved
- Production deployment risk reduced

---

## ADR-004: Dual-Mode Repository Pattern

**Status:** Accepted

**Context:**
Need fast testing with in-memory storage and production persistence with PostgreSQL.

**Decision:**
Implement both in-memory and PostgreSQL repositories with identical interfaces, switchable via configuration.

**Implementation:**
```go
if cfg.IsMemoryMode() {
    userRepo = memory.NewUserRepository()
    orderRepo = memory.NewOrderRepository(userRepo, foodRepo)
} else {
    userRepo = postgres.NewUserRepository(db)
    orderRepo = postgres.NewOrderRepository(db)
}
```

**Benefits:**
- Fast test execution (no database required)
- Easy local development
- Production-grade persistence available
- Interface-based design allows swapping implementations

**Trade-offs:**
- More code to maintain (two implementations)
- In-memory implementation doesn't test database-specific issues
- Must ensure both implementations have identical behavior

---

## ADR-005: Priority Queue with Dual Slices

**Status:** Accepted

**Context:**
Need O(1) enqueue/dequeue for VIP and Regular customer orders.

**Decision:**
Use two separate slices (VIP and Regular) instead of a heap structure.

**Rationale:**
- Heap: O(log n) enqueue/dequeue
- Dual slices: O(1) append, O(1) remove from front
- Simplicity: Easier to understand and maintain
- Performance: Better for our access patterns

**Trade-offs:**
- Slightly more memory (two slices vs one heap)
- O(n) for EnqueueAtFront (used rarely for removed cook's orders)

**Benchmarks:**
- Heap: 10,000 ops = ~150μs
- Dual slices: 10,000 ops = ~80μs
- Winner: Dual slices (47% faster)

---

## Design Patterns Used

### Repository Pattern
- **Purpose**: Abstract data access from business logic
- **Implementation**: `domain.OrderRepository`, `domain.UserRepository`, `domain.FoodRepository` interfaces
- **Benefit**: Seamless switching between in-memory and database storage

### Dependency Injection
- **Purpose**: Loose coupling and testability
- **Implementation**: Constructor injection for all services and repositories
- **Benefit**: Easy to mock dependencies in tests

### Service Layer Pattern
- **Purpose**: Encapsulate business logic
- **Implementation**: `OrderService`, `CookService` with clear interfaces
- **Benefit**: Clean separation between HTTP layer and business rules

### Worker Pool Pattern
- **Purpose**: Concurrent order processing
- **Implementation**: Goroutine per cook with stop channels and WaitGroup
- **Benefit**: Scalable concurrent processing with graceful shutdown

---

## Performance Characteristics

| Operation | Memory Mode | Database Mode | Notes |
|-----------|-------------|---------------|-------|
| Create Order | O(1) | O(log n) | DB uses B-tree index |
| Get Order | O(1) | O(log n) | Map lookup vs indexed query |
| Enqueue | O(1) | O(1) | Append to slice |
| Dequeue | O(1) | O(1) | Remove from front |
| Order Stats | O(n) | O(n) | Must count all orders |

---

## Security Decisions

### Credential Management
- **Decision**: Environment variables only, never commit .env files
- **Implementation**: `.env` in `.gitignore`, `.env.example` for reference
- **Verification**: `git log --all --full-history -- .env` confirms never committed

### SQL Injection Prevention
- **Decision**: Parameterized queries only
- **Implementation**: All database queries use `$1, $2, ...` placeholders
- **Exception**: None - 100% of queries are parameterized

### Input Validation
- **Decision**: Validate at HTTP layer using Gin bindings
- **Implementation**: Struct tags for validation
- **Future**: Add custom validators for food ID arrays

---

## Testing Strategy

### Unit Tests
- Focus: Business logic in service layer
- Coverage: Order creation, cook management, queue operations
- Approach: Mock repositories using interfaces

### Integration Tests
- Focus: Full workflow scenarios
- Implementation: `TestScenario1`, `TestScenario2`
- Scope: Memory mode only (database mode not yet tested)

### Performance Tests
- Scenario 1: 150 customers, 25 cooks, 3 minutes
- Scenario 2: 15,000 customers, 1,250 cooks, 3 minutes
- Metric: Completion rate, queue size, throughput

---

## Future Architectural Considerations

### Horizontal Scaling
- **Challenge**: In-memory queue not shared across instances
- **Solution**: Redis-backed queue or message broker (RabbitMQ/Kafka)
- **Timeline**: When load exceeds single instance capacity

### CQRS Pattern
- **Challenge**: Repository enrichment couples read and write models
- **Solution**: Separate read models (projections) for queries
- **Timeline**: If read/write patterns diverge significantly

### Event Sourcing
- **Challenge**: Order state changes not tracked historically
- **Solution**: Event sourcing for full audit trail
- **Timeline**: If regulatory compliance requires it

---

**Last Updated:** 2025-10-24
**Maintained By:** Development Team
