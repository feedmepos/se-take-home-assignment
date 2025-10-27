# Testing Guide

Comprehensive testing documentation for the McMocknald Order Kiosk System.

## Table of Contents

- [Overview](#overview)
- [Test Organization](#test-organization)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The McMocknald Order Kiosk project follows a comprehensive testing strategy that separates tests by purpose and execution characteristics. We use **Mage** as our build tool for cross-platform compatibility (replacing Make/mingw32 on Windows).

### Test Categories

| Category | Purpose | Build Tag | Location | Speed |
|----------|---------|-----------|----------|-------|
| **Unit Tests** | Test individual functions/methods | None | Alongside source | Fast (ms) |
| **Integration Tests** | Test component interactions | `integration` | `test/integration/` | Medium (seconds) |
| **Scenario Tests** | Load and performance testing | `scenario` | `test/scenario/` | Slow (minutes) |
| **Benchmark Tests** | Performance benchmarking | `benchmark` | `test/benchmark/` | Variable |

### Why Mage?

Mage is a Go-based build tool that provides several advantages:

- **Cross-platform**: Works on Windows, Linux, macOS without requiring mingw32 or make
- **Go-native**: Written in Go, uses Go syntax
- **Type-safe**: Compile-time checking of build tasks
- **No dependencies**: Only requires Go
- **Easy to learn**: Simple function-based API

---

## Test Organization

### Directory Structure

```
mcmocknald-order-kiosk-project/
│
├── test/                          # Centralized test suites
│   ├── scenario/                  # Load and scenario tests
│   │   ├── small_load_test.go    # Small-scale load test
│   │   └── large_load_test.go    # Large-scale load test
│   │
│   ├── integration/               # Integration tests
│   │   ├── database_integration_test.go
│   │   ├── api_integration_test.go
│   │   └── end_to_end_test.go
│   │
│   ├── benchmark/                 # Performance benchmarks
│   │   ├── queue_benchmark_test.go
│   │   ├── repository_benchmark_test.go
│   │   └── service_benchmark_test.go
│   │
│   └── helpers/                   # Shared test utilities
│       └── test_utils.go          # Helper functions
│
├── internal/service/
│   ├── order_service.go
│   └── order_service_test.go     # Unit tests for order service
│
├── pkg/queue/
│   ├── priority_queue.go
│   └── priority_queue_test.go    # Unit tests for priority queue
│
└── magefile.go                    # Build tasks definition
```

### Build Tags

Build tags are used to separate tests by execution characteristics:

**Scenario Tests** (`//go:build scenario`):
- Long-running load tests
- Require significant CPU/memory
- Run on-demand, not in CI

**Integration Tests** (`//go:build integration`):
- Require external services (database)
- Test component interactions
- Run in CI with proper setup

**Benchmark Tests** (`//go:build benchmark`):
- Performance profiling
- Run on-demand for optimization

**Unit Tests** (no build tag):
- Fast, isolated tests
- No external dependencies
- Always run in CI

---

## Getting Started

### Prerequisites

1. **Go 1.25+** installed
2. **Mage** build tool installed

### Installing Mage

Choose one method:

**Option 1: Go Install (Recommended)**
```bash
go install github.com/magefile/mage@latest
```

**Option 2: Chocolatey (Windows)**
```bash
choco install mage
```

**Option 3: Scoop (Windows)**
```bash
scoop install mage
```

**Option 4: Homebrew (macOS/Linux)**
```bash
brew install mage
```

**Verify Installation:**
```bash
mage -version
```

### Quick Setup

```bash
# Clone repository
git clone <repository-url>
cd mcmocknald-order-kiosk-project

# Install dependencies
mage deps

# Verify everything works
mage test
```

---

## Running Tests

### Using Mage (Recommended)

View all available test commands:

```bash
mage -l
```

**Quick Reference:**

```bash
# Fast unit tests (recommended for development)
mage test

# All tests (unit + integration + scenario)
mage testall

# Specific test categories
mage testunit          # Unit tests only
mage testintegration   # Integration tests (requires DB)
mage testscenario      # All scenario tests

# Specific scenarios
mage tests1           # Small load (150 orders/sec)
mage tests2           # Large load (15,000 orders/sec)

# Coverage report
mage testcoverage     # Generates coverage.html
```

### Using Go Test Directly

```bash
# Unit tests
go test ./... -v -short

# Scenario tests
go test ./test/scenario/... -v -tags=scenario -timeout 10m

# Integration tests
go test ./test/integration/... -v -tags=integration

# Specific test
go test -v -run TestCreateOrderWithVIPCustomer ./internal/service

# With coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

---

## Test Types

### 1. Unit Tests

**Purpose**: Test individual functions and methods in isolation

**Location**: Alongside source files (`*_test.go`)

**Characteristics**:
- Fast execution (milliseconds)
- No external dependencies
- Mock/stub external interactions
- High code coverage target (>80%)

**Example**: `pkg/queue/priority_queue_test.go`

```go
func TestEnqueueRegularOrder(t *testing.T) {
    pq := NewPriorityQueue()

    order := &domain.Order{
        ID:           1,
        CustomerRole: domain.RoleRegularCustomer,
        Status:       domain.StatusPending,
    }

    err := pq.Enqueue(order)

    require.NoError(t, err)
    assert.Equal(t, 1, pq.Size())
}
```

**Run**:
```bash
mage test
# Or: go test ./pkg/queue -v
```

---

### 2. Integration Tests

**Purpose**: Test component interactions and external services

**Location**: `test/integration/`

**Build Tag**: `//go:build integration`

**Characteristics**:
- Tests multiple components together
- Requires external services (database)
- Slower than unit tests (seconds)
- Validates service integration

**Example Structure**:

```go
//go:build integration

package integration

import (
    "testing"
    // imports...
)

func TestDatabaseOrderCreation(t *testing.T) {
    // Setup database connection
    // Create order
    // Verify in database
    // Cleanup
}
```

**Run**:
```bash
# Start database first
mage dockerdb
mage migrateup

# Run integration tests
mage testintegration
```

---

### 3. Scenario Tests (Load Tests)

**Purpose**: Validate system behavior under load

**Location**: `test/scenario/`

**Build Tag**: `//go:build scenario`

**Characteristics**:
- Long-running (minutes)
- High resource usage
- Simulates real-world scenarios
- Performance validation

**Available Scenarios**:

#### Small Load Test (`TestSmallLoad`)
- **File**: `test/scenario/small_load_test.go`
- **Config**: 100 Regular + 50 VIP customers, 25 cooks
- **Rate**: 150 orders/second
- **Duration**: 3 minutes
- **Use Case**: Typical restaurant load

```bash
mage tests1
```

#### Large Load Test (`TestLargeLoad`)
- **File**: `test/scenario/large_load_test.go`
- **Config**: 10,000 Regular + 5,000 VIP customers, 1,250 cooks
- **Rate**: 15,000 orders/second
- **Duration**: 3 minutes
- **Use Case**: High-volume stress testing

```bash
mage tests2
```

**Sample Output**:
```
=== RUN   TestSmallLoad
[20s] Completed: 2,456, Incomplete: 543, Queue: 234
[40s] Completed: 5,123, Incomplete: 892, Queue: 156
[60s] Completed: 7,891, Incomplete: 1,234, Queue: 89
...
=== Small Load Test Results ===
Regular Customers: 100
VIP Customers: 50
Cook Bots: 25
Test Duration: 3m0s
Final Completed: 26,789
Final Incomplete: 234
Completion Rate: 99.13%
--- PASS: TestSmallLoad (185.23s)
```

---

### 4. Benchmark Tests

**Purpose**: Performance profiling and optimization

**Location**: `test/benchmark/`

**Build Tag**: `//go:build benchmark`

**Example**:

```go
//go:build benchmark

package benchmark

func BenchmarkQueueEnqueue(b *testing.B) {
    pq := queue.NewPriorityQueue()
    order := &domain.Order{
        ID:           1,
        CustomerRole: domain.RoleRegularCustomer,
    }

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        pq.Enqueue(order)
    }
}
```

**Run**:
```bash
go test ./test/benchmark/... -bench=. -benchmem -tags=benchmark
```

---

## Writing Tests

### Test File Naming

- Unit tests: `*_test.go` in same package
- Integration tests: `*_integration_test.go` in `test/integration/`
- Scenario tests: `*_test.go` in `test/scenario/`
- Benchmarks: `*_benchmark_test.go` in `test/benchmark/`

### Test Function Naming

Follow Go conventions:

```go
// Unit test
func TestFunctionName(t *testing.T) { }

// Table-driven test
func TestFunctionName_Scenario(t *testing.T) { }

// Benchmark
func BenchmarkFunctionName(b *testing.B) { }
```

### Using Test Helpers

Common test utilities are in `test/helpers/test_utils.go`:

```go
import "mcmocknald-order-kiosk/test/helpers"

// Create test customers
customers := helpers.CreateCustomers(ctx, t, userRepo, 10, domain.RoleRegularCustomer)

// Create test cook bots
cooks := helpers.CreateCooks(ctx, t, userRepo, 5)

// Create sample foods
foods := helpers.CreateSampleFoods(ctx, t, foodRepo)

// Start cook worker
go helpers.StartCookWorker(ctx, cookService, cookID, duration)
```

### Assertion Libraries

We use `testify` for assertions:

```go
import (
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// Assertions that continue on failure
assert.Equal(t, expected, actual, "message")
assert.NotNil(t, obj)
assert.True(t, condition)

// Assertions that stop test on failure
require.NoError(t, err)
require.NotNil(t, obj)
```

### Test Setup and Teardown

```go
func TestSomething(t *testing.T) {
    // Setup
    ctx := context.Background()
    service := setupTestService()

    // Teardown (if needed)
    t.Cleanup(func() {
        // Cleanup code
    })

    // Test logic
    result, err := service.DoSomething(ctx)
    require.NoError(t, err)
    assert.Equal(t, expected, result)
}
```

---

## Best Practices

### 1. Test Isolation

**DO**: Each test should be independent
```go
func TestCreateOrder(t *testing.T) {
    // Create fresh service for this test
    service := setupTestService()
    // ...
}
```

**DON'T**: Share state between tests
```go
var sharedService OrderService // BAD - shared state

func TestCreateOrder(t *testing.T) {
    // Using shared service - AVOID
}
```

### 2. Clear Test Names

**DO**: Descriptive test names
```go
func TestCreateOrderWithVIPCustomer(t *testing.T)
func TestDequeueReturnsVIPOrderFirst(t *testing.T)
```

**DON'T**: Vague names
```go
func TestOrder(t *testing.T)
func TestQueue1(t *testing.T)
```

### 3. Table-Driven Tests

For testing multiple scenarios:

```go
func TestEnqueue(t *testing.T) {
    tests := []struct {
        name        string
        order       *domain.Order
        wantErr     bool
        expectedSize int
    }{
        {
            name: "valid regular order",
            order: &domain.Order{ID: 1, CustomerRole: domain.RoleRegularCustomer},
            wantErr: false,
            expectedSize: 1,
        },
        {
            name: "nil order",
            order: nil,
            wantErr: true,
            expectedSize: 0,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            pq := NewPriorityQueue()
            err := pq.Enqueue(tt.order)

            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
            assert.Equal(t, tt.expectedSize, pq.Size())
        })
    }
}
```

### 4. Test Coverage Goals

| Component | Target Coverage | Priority |
|-----------|----------------|----------|
| Business Logic | >90% | Critical |
| Services | >85% | High |
| Repositories | >80% | High |
| Controllers | >75% | Medium |
| Utilities | >80% | Medium |

Check coverage:
```bash
mage testcoverage
```

### 5. Fast Feedback

- Run unit tests frequently during development
- Use scenario tests before major releases
- Integration tests in CI/CD pipeline

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mcmocknald
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.25'

      - name: Install Mage
        run: go install github.com/magefile/mage@latest

      - name: Install dependencies
        run: mage deps

      - name: Run unit tests
        run: mage test

      - name: Run integration tests
        run: mage testintegration
        env:
          DB_HOST: localhost
          DB_PORT: 5432

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.out
```

### GitLab CI Example

```yaml
stages:
  - test

test:
  stage: test
  image: golang:1.25

  services:
    - postgres:15-alpine

  variables:
    POSTGRES_DB: mcmocknald
    POSTGRES_PASSWORD: postgres
    DB_HOST: postgres

  before_script:
    - go install github.com/magefile/mage@latest
    - mage deps

  script:
    - mage test
    - mage testintegration

  coverage: '/total:.*?(\d+\.\d+)%/'
```

---

## Troubleshooting

### Common Issues

#### Issue: Mage command not found

**Solution**:
```bash
# Ensure $GOPATH/bin is in PATH
export PATH=$PATH:$(go env GOPATH)/bin

# Or reinstall
go install github.com/magefile/mage@latest
```

#### Issue: Integration tests fail with database error

**Solution**:
```bash
# Start database
mage dockerdb

# Run migrations
mage migrateup

# Verify connection
psql -h localhost -p 7001 -U postgres -d mcmocknald -c "SELECT 1"
```

#### Issue: Scenario tests timeout

**Solution**:
```bash
# Increase timeout
go test ./test/scenario/... -v -tags=scenario -timeout 15m

# Or use Mage (already configured)
mage tests2
```

#### Issue: Tests fail with "cannot find package"

**Solution**:
```bash
# Download dependencies
mage deps

# Or manually
go mod download
go mod tidy
```

### Getting Help

1. Check test logs for specific errors
2. Review test documentation in source files
3. Run tests with `-v` flag for verbose output
4. Check [GitHub Issues](repository-url/issues)

---

## Additional Resources

### Related Documentation

- [README.md](../README.md) - Project overview
- [API.md](API.md) - API documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture decisions
- [EXAMPLES.md](EXAMPLES.md) - Usage examples

### Testing Tools

- [testify](https://github.com/stretchr/testify) - Assertion library
- [mage](https://magefile.org/) - Build tool
- [Go testing package](https://pkg.go.dev/testing) - Standard library

### Learning Resources

- [Go Testing Best Practices](https://go.dev/doc/tutorial/add-a-test)
- [Table Driven Tests](https://go.dev/wiki/TableDrivenTests)
- [Mage Documentation](https://magefile.org/)

---

**Happy Testing!** 🧪

[⬆ Back to README](../README.md)
