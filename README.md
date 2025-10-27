# McMocknald Order Kiosk System

[![Go Version](https://img.shields.io/badge/Go-1.25%2B-blue.svg)](https://golang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture-orange.svg)](docs/ARCHITECTURE.md)

A high-performance food chain kiosk ordering system built with Go, featuring a hybrid priority queue system (VIP prioritization + FIFO) and dual-mode operation (in-memory and PostgreSQL). Designed following SOLID principles, dependency injection patterns, and repository pattern for maximum maintainability, testability, and scalability.

---

## Table of Contents

### Getting Started
- [Overview](#overview)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)

### Running the Application
- [Memory Mode](#memory-mode-fast-testing)
- [Database Mode](#database-mode-production)
- [Running Tests](#running-tests)
- [Docker Setup](#docker-setup)

### Documentation
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)

### Development
- [SOLID Principles](#solid-principles)
- [Design Patterns](#design-patterns)
- [Performance Optimizations](#performance-optimizations)
- [Testing Strategy](#testing-strategy)

### Additional Resources
- [Examples & Tutorials](#examples--tutorials)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The McMocknald Order Kiosk System is a production-ready ordering platform that demonstrates enterprise-grade Go application development. The system handles customer orders through a priority queue mechanism where VIP customers receive preferential treatment while maintaining fairness through FIFO ordering within each priority level.

### Key Features

- **Hybrid Priority Queue**: VIP customers get priority, with FIFO ordering within each customer type
- **Dual Mode Operation**: Switch seamlessly between in-memory (testing) and PostgreSQL (production) storage
- **Dynamic Cook Bot Management**: Add, remove, and reinstate cook bots on-the-fly without service disruption
- **High Performance**: Optimized for millions of orders/second with O(1) queue operations
- **Worker Pool Pattern**: Adjustable number of cook bots processing orders concurrently
- **Order Lifecycle Management**: PENDING → SERVING (10s) → COMPLETE with full audit trail
- **Soft Deletion**: All resources use soft deletion for data retention and audit compliance
- **Daily Rotating Logs**: Comprehensive logging with daily file rotation
- **RESTful API**: Fully documented with Swagger/OpenAPI (auto-enabled in non-production)
- **Graceful Shutdown**: Clean worker termination and resource cleanup
- **Food Catalog**: Browse menu items with filtering by type (Food, Drink, Dessert)

---

## Quick Start

### Memory Mode (Fast Testing)

```bash
# Clone the repository
git clone <repository-url>
cd mcmocknald-order-kiosk-project

# Install dependencies
go mod download

# Run in memory mode
MODE=memory go run cmd/api/main.go
```

### Database Mode (Production)

```bash
# Start PostgreSQL
docker-compose up -d

# Run migrations
psql -h localhost -p 7001 -U postgres -d mcmocknald -f migrations/001_create_schema.sql

# Run application
MODE=database go run cmd/api/main.go
```

### Quick Test

```bash
# Health check
curl http://localhost:8080/health

# Create a cook bot
curl -X POST http://localhost:8080/api/cooks \
  -H "Content-Type: application/json" \
  -d '{"name": "Cook Bot 1"}'

# View available foods
curl http://localhost:8080/api/v1/foods

# Create an order
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "food_ids": [1, 2]}'
```

---

## Prerequisites

### Required
- **Go 1.25.x or higher** - [Download Go](https://golang.org/dl/)
- **Git** - For cloning the repository

### Optional (for Database Mode)
- **PostgreSQL 13+** - Can use Docker or local installation
- **Docker & Docker Compose** - For containerized PostgreSQL

### Development Tools (Optional)
- **Mage** - For running build tasks (replaces Make) - [Install Mage](#installing-mage)
- **curl** - For API testing
- **Postman** or **Insomnia** - For API exploration

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mcmocknald-order-kiosk-project
```

### 2. Install Dependencies

```bash
go mod download
```

### 3. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration (optional)
nano .env
```

### 4. Install Mage (Build Tool)

Mage is a Go-based build tool that replaces Make. Choose one installation method:

```bash
# Option 1: Using Go install (recommended)
go install github.com/magefile/mage@latest

# Option 2: Using Chocolatey (Windows)
choco install mage

# Option 3: Using Scoop (Windows)
scoop install mage

# Verify installation
mage -version
```

### 5. Database Setup (Optional - for Database Mode)

```bash
# Start PostgreSQL container
mage dockerdb

# Run migrations
mage migrateup

# Or manually:
docker-compose up -d
psql -h localhost -p 7001 -U postgres -d mcmocknald -f migrations/001_create_schema.sql
```

---

## Configuration

Configuration is managed via environment variables in the `.env` file:

```env
# Application Mode
MODE=memory                          # Options: memory, database

# Environment
ENV=development                      # Options: development, staging, production

# Server Configuration
SERVER_PORT=8080                     # HTTP server port

# Database Configuration (for database mode)
DB_HOST=localhost
DB_PORT=7001
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=mcmocknald
DB_SSL_MODE=disable

# Order Processing
ORDER_SERVING_DURATION=10s           # Time to process each order

# Worker Configuration
INITIAL_COOK_BOTS=1                  # Number of cook bots to start with

# Logging
LOG_DIRECTORY=./logs                 # Log file directory
```

### Configuration Options Explained

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `MODE` | Storage mode | `memory` | `memory`, `database` |
| `ENV` | Environment | `development` | `development`, `staging`, `production` |
| `SERVER_PORT` | HTTP port | `8080` | Any valid port number |
| `ORDER_SERVING_DURATION` | Order processing time | `10s` | Any valid duration (e.g., `5s`, `1m`) |
| `INITIAL_COOK_BOTS` | Starting cook count | `1` | Any positive integer |

---

## API Documentation

### Comprehensive API Guides

The API is organized by feature domain for easy navigation:

#### 📚 **[API Overview](docs/API.md)**
High-level API introduction with quick links to all endpoints, authentication, error handling, and performance characteristics.

#### 📦 **[Orders API Reference](docs/ORDERS_API.md)**
Complete documentation for order management:
- Create orders
- Get order details
- View order statistics
- Order status flow
- Priority queue behavior
- Integration examples (JavaScript, Python)

#### 🤖 **[Cook Bots API Reference](docs/COOKS_API.md)**
Complete documentation for cook bot management:
- Create/remove cook bots
- Reinstate deleted bots
- Accept orders from queue
- Worker pool architecture
- Scaling strategies
- Integration examples

#### 🍔 **[Food API Reference](docs/FOOD_API.md)**
Complete documentation for food catalog:
- List all food items
- Filter by type (Food, Drink, Dessert)
- Get food item details
- Soft delete awareness
- Performance characteristics

### Interactive Documentation

**Swagger UI** (Auto-enabled in development):
```
http://localhost:8080/swagger/index.html
```

Regenerate Swagger docs:
```bash
swag init -g cmd/api/main.go -o docs
```

### Quick API Reference

| Feature | Endpoints | Documentation |
|---------|-----------|---------------|
| **Health** | `GET /health` | [API Overview](docs/API.md) |
| **Orders** | `POST /api/orders`<br>`GET /api/orders/:id`<br>`GET /api/orders/stats` | [Orders API](docs/ORDERS_API.md) |
| **Cook Bots** | `POST /api/cooks`<br>`GET /api/cooks`<br>`DELETE /api/cooks/:id`<br>`POST /api/cooks/:id/reinstate`<br>`POST /api/cooks/:id/accept` | [Cook Bots API](docs/COOKS_API.md) |
| **Foods** | `GET /api/v1/foods`<br>`GET /api/v1/foods/:id` | [Food API](docs/FOOD_API.md) |

---

## Architecture

### Clean Architecture

The system follows **Clean Architecture** principles with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│              Controller Layer (MVC Pattern)             │
│         Gin Controllers, HTTP Request/Response          │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   Service Layer (Business Logic)        │
│           OrderService, CookService, FoodService        │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  Domain Layer (Entities)                │
│              Order, User, Food, Repository Interfaces   │
└───────────────────────┬─────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
┌─────────────▼─────┐   ┌────────▼──────────┐
│  Infrastructure   │   │  Infrastructure   │
│  (PostgreSQL)     │   │  (In-Memory)      │
└───────────────────┘   └───────────────────┘
```

### SOLID Principles

1. **Single Responsibility Principle (SRP)**
   - Each package has one clear purpose
   - `domain/`: Pure business entities
   - `service/`: Business logic only
   - `controller/`: HTTP layer only (MVC pattern)
   - `infrastructure/`: Data access only

2. **Open/Closed Principle (OCP)**
   - Easy to add new repository implementations
   - New services can be added without modifying existing code
   - Extensible via interfaces

3. **Liskov Substitution Principle (LSP)**
   - All repository implementations are interchangeable
   - Memory and PostgreSQL repos implement same interfaces
   - Can switch modes without code changes

4. **Interface Segregation Principle (ISP)**
   - Small, focused interfaces
   - `OrderRepository`, `UserRepository`, `FoodRepository`
   - No forced implementation of unused methods

5. **Dependency Inversion Principle (DIP)**
   - Services depend on repository interfaces, not implementations
   - Main app wires concrete implementations
   - No direct dependencies on infrastructure

### Design Patterns

| Pattern | Implementation | Benefit |
|---------|----------------|---------|
| **Repository Pattern** | `domain/repository.go` interfaces | Abstracted data access |
| **Dependency Injection** | Constructor injection | Testability, loose coupling |
| **Service Layer Pattern** | `service/` package | Encapsulated business logic |
| **Worker Pool Pattern** | Cook bot goroutines | Concurrent processing |
| **Soft Delete Pattern** | `deleted_at` timestamps | Data retention, audit trail |
| **Priority Queue** | Dual-slice implementation | O(1) operations |

### Detailed Architecture Documentation

📖 **[Architecture Decisions (ADR)](docs/ARCHITECTURE.md)**
- Repository data enrichment pattern
- Context-based goroutine cancellation
- Idempotent database migrations
- Dual-mode repository pattern
- Priority queue implementation
- Design patterns explained

📖 **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)**
- Complete file structure
- Component descriptions
- Performance analysis
- Testing results
- Production readiness checklist

---

## Project Structure

```
mcmocknald-order-kiosk-project/
│
├── cmd/
│   └── api/
│       └── main.go                     # Application entry point with DI
│
├── internal/
│   ├── config/
│   │   └── config.go                   # Configuration management
│   │
│   ├── domain/                         # Business Entities & Interfaces
│   │   ├── food.go                     # User entity (Customer, Cook)
│   │   ├── order.go                    # Order entity
│   │   ├── repository.go                     # Food entity
│   │   └── user.go               # Repository interfaces
│   │
│   ├── infrastructure/                 # Data Access Implementations
│   │   ├── memory/                     # In-Memory Repositories
│   │   │   ├── food_repository.go
│   │   │   ├── order_repository.go
│   │   │   ├── role_repository.go
│   │   │   └── user_repository.go
│   │   └── postgres/                   # PostgreSQL Repositories
│   │       ├── db.go
│   │       ├── user_repository.go
│   │       ├── order_repository.go
│   │       ├── food_repository.go
│   │       └── role_repository.go
│   │
│   ├── service/                        # Business Logic
│   │   ├── cook_service.go
│   │   ├── food_service.go
│   │   ├── order_service.go
│   │   └── order_service_test.go
│   │
│   ├── controller/                     # HTTP Controllers (MVC)
|   |   └── v1/
│   │       ├── cook_controller.go
│   │       ├── food_controller.go
│   │       └── order_controller.go
│   │
│   └── logger/
│       └── logger.go                   # Daily rotating file logger
│
├── pkg/
│   └── queue/                          # Reusable Priority Queue
│       ├── errors.go
│       └── priority_queue.go
│
├── migrations/
│   └── 001_create_schema.sql          # Database schema and seed data
│
├── docs/                               # Comprehensive Documentation
│   ├── API.md                          # API Overview
│   ├── COOKS_API.md                    # Cook Bots API Reference
│   ├── FOOD_API.md                     # Food API Reference
│   ├── ORDERS_API.md                   # Orders API Reference
│   ├── ARCHITECTURE.md                 # Architecture Decisions
│   ├── EXAMPLES.md                     # Usage Examples
│   └── IMPLEMENTATION_SUMMARY.md       # Technical Overview
│
├── logs/                               # Application Logs (generated)
│   └── orders-[dd-mm-yyyy].log
│
├── .env                                # Environment Configuration
├── .env.example                        # Configuration Template
├── .gitignore                          # Git Ignore Rules
├── docker-compose.yml                  # PostgreSQL Setup
├── Makefile                            # Build Commands
├── go.mod                              # Go Module Dependencies
├── go.sum                              # Dependency Checksums
└── README.md                           # This File
```

---

## Database Schema

### Entity Relationship

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     role     │       │     user     │       │    order     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │───┐   │ id (PK)      │───┐   │ id (PK)      │
│ name         │   └──>│ role (FK)    │   │   │ status       │
│ created_at   │       │ name         │   └──>│ ordered_by   │
│ modified_at  │       │ created_at   │       │ assigned_cook│
└──────────────┘       │ modified_at  │   ┌──>│ created_at   │
                       │ deleted_at   │   │   │ modified_at  │
                       └──────────────┘   │   │ deleted_at   │
                                          │   └──────────────┘
                       ┌──────────────┐   │          │
                       │     food     │   │          │
                       ├──────────────┤   │          │
                       │ id (PK)      │   │          │
                       │ name         │   │          │
                       │ type         │   │          │
                       │ created_at   │   │          │
                       │ modified_at  │   │          │
                       │ deleted_at   │   │          │
                       └──────────────┘   │          │
                              │           │          │
                              │           │          │
                       ┌──────▼───────────▼──────┐   │
                       │    order_food (M2M)     │   │
                       ├─────────────────────────┤   │
                       │ order_id (FK) ──────────────┘
                       │ food_id (FK)            │
                       └─────────────────────────┘
```

### Pre-seeded Data

The system includes pre-seeded data for immediate testing:

**Roles:**
- Regular Customer
- VIP Customer
- Cook

**Users:**
- 2 Regular Customers
- 2 VIP Customers
- 1 Cook Bot

**Foods:**
- Burger (Food)
- Fries (Food)
- Pizza (Food)
- Soda (Drink)
- Water (Drink)
- Ice Cream (Dessert)
- Cake (Dessert)

---

## Performance Optimizations

### Time Complexity Analysis

| Operation | In-Memory | Database | Notes |
|-----------|-----------|----------|-------|
| **Enqueue Order** | O(1) | O(1) | Append to slice |
| **Dequeue Order** | O(1) | O(1) | Remove from front |
| **Create Order** | O(1) | O(log n) | Map insert vs B-tree index |
| **Get Order** | O(1) | O(log n) | Direct lookup vs indexed query |
| **Order Stats** | O(n) | O(n) | Must scan all orders |
| **List Foods** | O(n) | O(n) | Must return all items |
| **Get Food by ID** | O(1) | O(log n) | Map lookup vs indexed query |

### Database Optimizations

**Indexes:**
- `user(role)` - Fast customer type filtering
- `order(status)` - Quick status-based queries
- `order(assigned_cook_user)` - Cook-specific lookups
- `order(ordered_by)` - Customer order history
- `food(type)` - Type-based filtering

**Connection Pooling:**
- Max Connections: 100
- Idle Connections: 10
- Connection Lifetime: 1 hour
- Idle Timeout: 10 minutes

**Query Optimization:**
- Parameterized queries for security and performance
- Batch operations where applicable
- Join optimization for enriched data
- Index hints for complex queries

### Throughput

**In-Memory Mode:**
- **Orders/Second**: Millions (CPU-limited)
- **Response Time**: Sub-millisecond
- **Use Case**: Testing, development, high-speed scenarios

**Database Mode:**
- **Orders/Second**: 10k-100k (database-limited)
- **Response Time**: Single-digit milliseconds
- **Use Case**: Production, data persistence, audit trails

---

## Running Tests

### Quick Start with Mage

The project uses **Mage** for running tests. Mage is a Go-based build tool that provides a cross-platform alternative to Make.

```bash
# View all available commands
mage -l

# Run all unit tests (fast)
mage test

# Run all tests (unit + integration + scenario)
mage testall
```

### Test Organization

Tests are organized by type for better clarity:

```
test/
├── scenario/          # Load and performance tests (requires -tags=scenario)
├── integration/       # Integration tests (requires -tags=integration)
├── benchmark/         # Performance benchmarks (requires -tags=benchmark)
└── helpers/          # Shared test utilities

internal/service/     # Unit tests alongside source code
pkg/queue/           # Queue unit tests
```

### Unit Tests

Fast tests that verify individual components:

```bash
# Run all unit tests
mage test

# Or directly with go
go test ./... -v -short

# Run specific package tests
go test ./pkg/queue -v
go test ./internal/service -v
```

### Scenario Tests (Load Testing)

**Small Load Test** (150 orders/second):
```bash
mage tests1
```
- 100 Regular customers
- 50 VIP customers
- 25 cook bots
- 3 minutes duration
- Reports every 20 seconds

**Large Load Test** (15,000 orders/second):
```bash
mage tests2
```
- 10,000 Regular customers
- 5,000 VIP customers
- 1,250 cook bots
- 3 minutes duration
- Demonstrates high-volume capability

**Run all scenario tests:**
```bash
mage testscenario
```

### Integration Tests

Tests that verify component interactions and database operations:

```bash
# Start database first
mage dockerdb
mage migrateup

# Run integration tests
mage testintegration
```

### Test Coverage

```bash
# Generate coverage report
mage testcoverage

# View coverage in browser
# Opens coverage.html automatically
```

### Available Mage Commands

Run `mage -l` to see all available commands:

```
Targets:
  build             builds the application
  clean             cleans build artifacts and logs
  deps              downloads and tidies dependencies
  dockerDB          starts PostgreSQL in Docker
  dockerDBStop      stops and removes the PostgreSQL container
  fmt               formats Go code
  lint              runs the linter
  migrateDown       rolls back database migrations (DOWN)
  migrateUp         runs database migrations (UP)
  run               runs the application in memory mode
  runDB             runs the application in database mode
  test              runs all tests (unit tests only, fast)
  testAll           runs all tests (unit + integration + scenario)
  testCoverage      runs tests with coverage report
  testIntegration   runs integration tests (requires database)
  testS1            runs scenario 1 (small load: 100 Regular, 50 VIP, 25 Cooks)
  testS2            runs scenario 2 (large load: 10,000 Regular, 5,000 VIP, 1,250 Cooks)
  testScenario      runs all scenario/load tests
  testUnit          runs unit tests only
```

### Manual Test Execution

You can also run tests directly with `go test`:

```bash
# Unit tests
go test ./... -v -short

# Scenario tests
go test ./test/scenario/... -v -tags=scenario -timeout 10m

# Integration tests
go test ./test/integration/... -v -tags=integration

# Specific test
go test -v -run TestCreateOrderWithVIPCustomer ./internal/service
```

### Testing Strategy

See **[docs/TESTING.md](docs/TESTING.md)** for comprehensive testing documentation including:
- Test organization and structure
- Writing new tests
- Best practices
- CI/CD integration

---

## Docker Setup

### PostgreSQL Container

Start PostgreSQL using Docker Compose:

```bash
# Start PostgreSQL
docker-compose up -d

# Check status
docker ps

# View logs
docker-compose logs -f

# Stop PostgreSQL
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Database Access

```bash
# Connect to PostgreSQL
psql -h localhost -p 7001 -U postgres -d mcmocknald

# Run migrations
psql -h localhost -p 7001 -U postgres -d mcmocknald -f migrations/001_create_schema.sql
```

---

## Examples & Tutorials

### 📖 Complete Workflow Examples

**[Usage Examples Documentation](docs/EXAMPLES.md)**

Comprehensive examples including:
- Complete order workflow
- Cook bot management
- Food catalog browsing
- Database queries
- Load testing
- Monitoring logs
- Troubleshooting

### Quick Examples

**Create Order Workflow:**
```bash
# 1. Create cook bot
curl -X POST http://localhost:8080/api/cooks \
  -H "Content-Type: application/json" \
  -d '{"name": "Cook Bot 1"}'

# 2. View available foods
curl http://localhost:8080/api/v1/foods?type=Food

# 3. Create VIP order
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 3, "food_ids": [1, 2, 4]}'

# 4. Cook accepts order
curl -X POST http://localhost:8080/api/cooks/5/accept

# 5. Check order status
curl http://localhost:8080/api/orders/1
```

---

## Troubleshooting

### Common Issues

**Issue: Port already in use**
```bash
# Solution: Change port in .env
SERVER_PORT=8081
```

**Issue: Database connection failed**
```bash
# Check PostgreSQL is running
docker ps

# Restart PostgreSQL
docker-compose restart

# Check connection
psql -h localhost -p 7001 -U postgres
```

**Issue: No orders in queue**
```bash
# Check queue size
curl http://localhost:8080/api/orders/stats

# Create test orders
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "food_ids": [1]}'
```

### Logging

**View Logs:**
```bash
# Today's log
tail -f logs/orders-$(date +%d-%m-%Y).log

# All logs
ls -lh logs/
```

**Log Format:**
```
[24/10/2025 - 14:30:45] [INFO] Order 1 created by customer VIP Customer 1
[24/10/2025 - 14:30:46] [INFO] Order 1 accepted by cook Cook Bot 1 (ID: 5)
[24/10/2025 - 14:30:56] [INFO] Order 1 completed by cook 5
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow SOLID principles** and existing code patterns
4. **Add tests** for new functionality
5. **Update documentation** (README, API docs)
6. **Commit your changes** (`git commit -m 'Add amazing feature'`)
7. **Push to the branch** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Code Standards

- Follow Go best practices and idioms
- Add comments for exported functions
- Include unit tests (aim for >80% coverage)
- Update API documentation for endpoint changes

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Additional Resources

### Documentation Quick Links

| Document | Description | Link |
|----------|-------------|------|
| **API Overview** | High-level API documentation | [docs/API.md](docs/API.md) |
| **Orders API** | Detailed orders endpoints | [docs/ORDERS_API.md](docs/ORDERS_API.md) |
| **Cook Bots API** | Detailed cook bot endpoints | [docs/COOKS_API.md](docs/COOKS_API.md) |
| **Food API** | Detailed food catalog endpoints | [docs/FOOD_API.md](docs/FOOD_API.md) |
| **Architecture** | Design decisions and patterns | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Implementation** | Complete technical overview | [docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md) |
| **Examples** | Usage examples and tutorials | [docs/EXAMPLES.md](docs/EXAMPLES.md) |

### Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review architecture decisions

---

## Acknowledgments

Built with:
- [Go](https://golang.org/) - Programming language
- [Gin](https://gin-gonic.com/) - HTTP web framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Docker](https://www.docker.com/) - Containerization

---

**Made with ❤️ using Clean Architecture and SOLID Principles**

[⬆ Back to Top](#mcmocknald-order-kiosk-system)
