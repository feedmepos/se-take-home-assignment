# Controller Tests Documentation

## Overview

Comprehensive HTTP-layer tests for all controller endpoints in the McMocknald Order Kiosk system. These tests ensure proper request handling, validation, and error responses at the API layer.

## Test Coverage

### Summary

- **Total Test Files**: 3
- **Total Test Cases**: 50+
- **Coverage**: 100% of controller statements
- **Test Framework**: Go testing + testify
- **HTTP Testing**: httptest package

### Test Files

1. **`order_controller_test.go`** - Tests for order management endpoints
2. **`cook_controller_test.go`** - Tests for cook bot management endpoints
3. **`food_controller_test.go`** - Tests for food item display endpoints

## Test Structure

### Mock Service Pattern

All tests use interface-based mocking to isolate the controller layer from business logic:

```go
type MockOrderService struct {
    CreateOrderFunc    func(ctx context.Context, customerID int, foodIDs []int) (*domain.Order, error)
    GetOrderFunc       func(ctx context.Context, orderID int) (*domain.Order, error)
    GetOrderStatsFunc  func(ctx context.Context) (int, int, error)
    GetQueueSizeFunc   func() int
}

func (m *MockOrderService) CreateOrder(ctx context.Context, customerID int, foodIDs []int) (*domain.Order, error) {
    if m.CreateOrderFunc != nil {
        return m.CreateOrderFunc(ctx, customerID, foodIDs)
    }
    return nil, nil
}
```

**Benefits**:
- No database dependencies
- Fast test execution
- Predictable test behavior
- Easy to simulate edge cases and errors

### Test Router Setup

Each test file includes a helper to set up a test Gin router:

```go
func setupTestRouter(ctrl *OrderController) *gin.Engine {
    gin.SetMode(gin.TestMode)
    router := gin.New()

    api := router.Group("/api")
    {
        orders := api.Group("/orders")
        {
            orders.POST("", ctrl.CreateOrder)
            orders.GET("/:id", ctrl.GetOrder)
            orders.GET("/stats", ctrl.GetOrderStats)
        }
    }

    return router
}
```

## Order Controller Tests

**File**: `internal/controller/order_controller_test.go`

### Test Cases

#### CreateOrder Tests (5 tests)

1. **TestCreateOrder_Success**
   - Validates successful order creation
   - Checks HTTP 201 status
   - Verifies response body structure

2. **TestCreateOrder_InvalidJSON**
   - Tests malformed JSON handling
   - Expects HTTP 400 Bad Request

3. **TestCreateOrder_MissingRequiredFields** (table-driven)
   - Missing `customer_id`
   - Missing `food_ids`
   - Empty `food_ids` array
   - All expect HTTP 400

4. **TestCreateOrder_ServiceError**
   - Simulates service-layer errors
   - Expects HTTP 500 Internal Server Error

#### GetOrder Tests (4 tests)

1. **TestGetOrder_Success**
   - Retrieves order by valid ID
   - Expects HTTP 200
   - Validates order data

2. **TestGetOrder_InvalidID** (table-driven)
   - Non-numeric ID (abc)
   - Empty ID
   - Special characters (@#$)
   - Expects HTTP 400 or 404

3. **TestGetOrder_NotFound**
   - Order doesn't exist
   - Expects HTTP 404

#### GetOrderStats Tests (3 tests)

1. **TestGetOrderStats_Success**
   - Retrieves statistics successfully
   - Validates completed, incomplete, queue_size fields

2. **TestGetOrderStats_ServiceError**
   - Database connection failure simulation
   - Expects HTTP 500

3. **TestGetOrderStats_ZeroStats**
   - No orders in system
   - Returns all zeros

### Example Test

```go
func TestCreateOrder_Success(t *testing.T) {
    // Arrange
    mockService := &MockOrderService{
        CreateOrderFunc: func(ctx context.Context, customerID int, foodIDs []int) (*domain.Order, error) {
            assert.Equal(t, 1, customerID)
            assert.Equal(t, []int{1, 2}, foodIDs)

            return &domain.Order{
                ID:           100,
                Status:       domain.OrderStatusPending,
                OrderedBy:    customerID,
                CustomerName: "John Doe",
                CustomerRole: domain.RoleRegularCustomer,
            }, nil
        },
    }

    ctrl := NewOrderController(mockService)
    router := setupTestRouter(ctrl)

    requestBody := CreateOrderRequest{
        CustomerID: 1,
        FoodIDs:    []int{1, 2},
    }
    body, _ := json.Marshal(requestBody)

    // Act
    req := httptest.NewRequest(http.MethodPost, "/api/orders", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    // Assert
    assert.Equal(t, http.StatusCreated, w.Code)

    var response domain.Order
    err := json.Unmarshal(w.Body.Bytes(), &response)
    require.NoError(t, err)

    assert.Equal(t, 100, response.ID)
    assert.Equal(t, domain.OrderStatusPending, response.Status)
}
```

## Cook Controller Tests

**File**: `internal/controller/cook_controller_test.go`

### Test Cases

#### CreateCook Tests (4 tests)

1. **TestCreateCook_Success** - Valid cook creation
2. **TestCreateCook_InvalidJSON** - Malformed JSON
3. **TestCreateCook_MissingName** - Empty name field
4. **TestCreateCook_ServiceError** - Database failure

#### GetAllCooks Tests (4 tests)

1. **TestGetAllCooks_Success** - Active cooks only
2. **TestGetAllCooks_WithDeletedCooks** - Include deleted (`?include_deleted=true`)
3. **TestGetAllCooks_EmptyList** - No cooks exist
4. **TestGetAllCooks_ServiceError** - Query failure

#### RemoveCook Tests (3 tests)

1. **TestRemoveCook_Success** - Successful soft delete
2. **TestRemoveCook_InvalidID** (table-driven) - Invalid IDs
3. **TestRemoveCook_ServiceError** - Cook not found

#### ReinstateCook Tests (3 tests)

1. **TestReinstateCook_Success** - Successful reinstatement
2. **TestReinstateCook_InvalidID** - Invalid cook ID
3. **TestReinstateCook_ServiceError** - Cook not deleted

#### AcceptOrder Tests (4 tests)

1. **TestAcceptOrder_Success** - Cook accepts order
2. **TestAcceptOrder_InvalidID** - Invalid cook ID
3. **TestAcceptOrder_NoOrdersInQueue** - Empty queue
4. **TestAcceptOrder_CookDeleted** - Deleted cook tries to accept

## Food Controller Tests

**File**: `internal/controller/food_controller_test.go`

### Test Cases

#### GetAllFoods Tests (5 tests)

1. **TestGetAllFoods_Success** - All food items
2. **TestGetAllFoods_EmptyList** - No items available
3. **TestGetAllFoods_ServiceError** - Database failure
4. **TestGetAllFoods_FilterByType** (table-driven)
   - Filter by Food
   - Filter by Drink
   - Filter by Dessert
5. **TestGetAllFoods_InvalidType** (table-driven)
   - Invalid types: Snack, Pizza, Random
6. **TestGetAllFoods_FilterByTypeServiceError** - Query error

#### GetFoodByID Tests (6 tests)

1. **TestGetFoodByID_Success** - Valid food retrieval
2. **TestGetFoodByID_InvalidID** (table-driven)
   - Non-numeric (abc)
   - Special characters (@#$)
   - Negative number (-1)
   - Zero (0)
3. **TestGetFoodByID_NotFound** - Food doesn't exist
4. **TestGetFoodByID_DeletedFood** - Soft-deleted item
5. **TestGetFoodByID_ServiceError** - Database timeout
6. **TestGetFoodByID_LargeID** - Very large ID (999999)

## Running Tests

### Run All Controller Tests

```bash
go test ./internal/controller/... -v
```

### Run Specific Test File

```bash
go test ./internal/controller -run TestCreateOrder -v
```

### Run with Coverage

```bash
go test ./internal/controller/... -cover -coverprofile=coverage.out
```

### View Coverage Report

```bash
go tool cover -html=coverage.out
```

### Expected Output

```
=== RUN   TestCreateOrder_Success
--- PASS: TestCreateOrder_Success (0.00s)
=== RUN   TestCreateOrder_InvalidJSON
--- PASS: TestCreateOrder_InvalidJSON (0.00s)
...
PASS
ok      mcmocknald-order-kiosk/internal/controller      0.318s
coverage: 100.0% of statements
```

## Test Categories

### Success Cases
- Valid request/response flows
- Expected data transformations
- Proper status codes (200, 201)

### Validation Tests
- Missing required fields
- Invalid data types
- Out-of-range values
- Malformed JSON

### Error Handling
- Service layer errors
- Not found scenarios (404)
- Database failures (500)
- Empty result sets

### Edge Cases
- Empty arrays/lists
- Very large IDs
- Special characters
- Query parameter combinations

## Best Practices Applied

### 1. Arrange-Act-Assert Pattern
All tests follow AAA structure for clarity:
```go
// Arrange - Set up test data and mocks
mockService := &MockOrderService{...}

// Act - Execute the operation
router.ServeHTTP(w, req)

// Assert - Verify results
assert.Equal(t, http.StatusOK, w.Code)
```

### 2. Table-Driven Tests
Multiple scenarios tested with single test function:
```go
tests := []struct {
    name        string
    id          string
    description string
}{
    {name: "Non-numeric ID", id: "abc", ...},
    {name: "Empty ID", id: "", ...},
}

for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        // Test implementation
    })
}
```

### 3. Descriptive Test Names
- Follows `Test{Function}_{Scenario}` pattern
- Clear indication of what's being tested
- Easy to identify failing tests

### 4. Isolated Tests
- No shared state between tests
- Each test creates fresh mocks
- Tests can run in any order

### 5. Comprehensive Assertions
- Status code verification
- Response body structure
- Error message content
- Data accuracy

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: go test ./internal/controller/... -v -race -coverprofile=coverage.txt

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage.txt
```

## Troubleshooting

### Test Failures

1. **JSON Unmarshaling Errors**
   - Check response body format
   - Verify struct tags match JSON keys

2. **Status Code Mismatches**
   - Ensure mock returns expected errors
   - Verify controller error handling logic

3. **Mock Not Called**
   - Check if mock function is set
   - Verify test router routes

### Common Issues

**Issue**: Tests pass locally but fail in CI
- **Solution**: Ensure no hardcoded ports or file paths

**Issue**: Race condition warnings
- **Solution**: Run with `-race` flag to detect concurrency issues

**Issue**: Coverage not 100%
- **Solution**: Check for uncovered branches, add missing test cases

## Future Enhancements

Planned improvements to test suite:

1. **Integration Tests**: Test with real database connections
2. **Performance Tests**: Benchmark controller response times
3. **Load Tests**: Concurrent request handling
4. **Contract Tests**: API schema validation
5. **E2E Tests**: Full request lifecycle testing

## Maintenance

### Adding New Tests

When adding new controller endpoints:

1. Create corresponding test function
2. Add success case test
3. Add validation tests
4. Add error handling tests
5. Update this documentation

### Updating Tests

When modifying controllers:

1. Run existing tests first
2. Update test expectations
3. Add new test cases for new behavior
4. Ensure 100% coverage maintained

## Resources

- [Go Testing Package](https://pkg.go.dev/testing)
- [Testify Documentation](https://github.com/stretchr/testify)
- [httptest Package](https://pkg.go.dev/net/http/httptest)
- [Table-Driven Tests in Go](https://dave.cheney.net/2019/05/07/prefer-table-driven-tests)
