# Tasks

## Phase 1: Project Initialization and Domain Model Design

- [x] Task 1: Initialize Go project structure
  - [x] SubTask 1.1: Create go.mod file
  - [x] SubTask 1.2: Create DDD directory structure (domain/, application/, infrastructure/, interfaces/)
  - [x] SubTask 1.3: Update scripts/build.sh, scripts/test.sh, scripts/run.sh

- [x] Task 2: Design domain model (TDD)
  - [x] SubTask 2.1: Define Order entity (ID, Type, Status, CreatedAt)
  - [x] SubTask 2.2: Define OrderType value object (Normal, VIP)
  - [x] SubTask 2.3: Define OrderStatus value object (Pending, Processing, Complete)
  - [x] SubTask 2.4: Write Order entity unit tests

- [x] Task 3: Design high-concurrency ID generator (TDD)
  - [x] SubTask 3.1: Implement Snowflake algorithm
  - [x] SubTask 3.2: Support multi-restaurant isolation (RestaurantID)
  - [x] SubTask 3.3: Write ID generator unit tests (thread-safe)

## Phase 2: Priority Queue and Robot Scheduling

- [x] Task 4: Implement priority queue (TDD)
  - [x] SubTask 4.1: Design PriorityQueue data structure
  - [x] SubTask 4.2: Implement VIP priority logic
  - [x] SubTask 4.3: Implement order position maintenance (when bots are removed)
  - [x] SubTask 4.4: Write priority queue unit tests

- [x] Task 5: Implement cooking robots (TDD)
  - [x] SubTask 5.1: Define Bot entity (ID, Status, CurrentOrder)
  - [x] SubTask 5.2: Implement order processing logic (10-second processing time)
  - [x] SubTask 5.3: Implement Bot status management (Idle, Processing)
  - [x] SubTask 5.4: Write Bot unit tests

- [x] Task 6: Implement robot scheduler (TDD)
  - [x] SubTask 6.1: Design BotScheduler aggregate root
  - [x] SubTask 6.2: Implement dynamic bot addition/removal
  - [x] SubTask 6.3: Implement order allocation strategy
  - [x] SubTask 6.4: Write scheduler unit tests

## Phase 3: Application Layer and Infrastructure

- [x] Task 7: Implement application services (TDD)
  - [x] SubTask 7.1: Implement OrderService (create orders)
  - [x] SubTask 7.2: Implement BotService (manage robots)
  - [x] SubTask 7.3: Implement query services (get status)
  - [x] SubTask 7.4: Write application service unit tests

- [x] Task 8: Implement repositories (TDD)
  - [x] SubTask 8.1: Implement OrderRepository (in-memory implementation)
  - [x] SubTask 8.2: Implement BotRepository (in-memory implementation)
  - [x] SubTask 8.3: Write repository unit tests

## Phase 4: CLI Interface and Integration

- [x] Task 9: Implement CLI interactive interface
  - [x] SubTask 9.1: Design command structure (new-normal, new-vip, +bot, -bot, status)
  - [x] SubTask 9.2: Implement command parser
  - [x] SubTask 9.3: Implement timestamped output format
  - [x] SubTask 9.4: Write CLI integration tests

- [x] Task 10: Integration testing and validation
  - [x] SubTask 10.1: Write end-to-end scenario tests
  - [x] SubTask 10.2: Verify high-concurrency scenarios
  - [x] SubTask 10.3: Verify GitHub Actions compatibility

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2
- Task 5 depends on Task 2
- Task 6 depends on Task 4, Task 5
- Task 7 depends on Task 3, Task 6
- Task 8 depends on Task 2, Task 5
- Task 9 depends on Task 7, Task 8
- Task 10 depends on Task 9