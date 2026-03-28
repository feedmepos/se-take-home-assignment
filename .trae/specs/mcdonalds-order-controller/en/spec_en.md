# McDonald's Order Controller - Specification Document

## Why
McDonald's needs to implement an automated cooking robot system during COVID-19 to reduce manpower and improve efficiency. This system serves as an order controller, responsible for handling order control flow, supporting high-concurrency scenarios (millions of people placing orders simultaneously, tens of thousands of restaurants).

## What Changes
- Implement DDD-based order control system
- Support VIP and normal customer priority queues
- Implement dynamic cooking robot scaling
- Support high-concurrency ID generation (distributed snowflake algorithm)
- Implement order status flow (PENDING -> PROCESSING -> COMPLETE)
- Provide CLI interactive interface
- **BREAKING**: None (new project)

## Impact
- Affected specs: Order management, robot scheduling, priority queue
- Affected code: domain/, application/, infrastructure/, interfaces/ directories

## ADDED Requirements

### Requirement: Order Management
The system SHALL provide order creation and management functionality.

#### Scenario: Create Normal Order
- **WHEN** user clicks "New Normal Order"
- **THEN** system SHALL generate a unique increasing order number
- **AND** order SHALL appear at the end of PENDING area

#### Scenario: Create VIP Order
- **WHEN** user clicks "New VIP Order"
- **THEN** system SHALL generate a unique increasing order number
- **AND** order SHALL be inserted before all normal orders and after all VIP orders

#### Scenario: Order Number Generation (High Concurrency)
- **GIVEN** millions of people placing orders simultaneously
- **WHEN** system generates order numbers
- **THEN** order numbers SHALL be globally unique and increasing
- **AND** support isolation for tens of thousands of restaurants

### Requirement: Robot Management
The system SHALL support dynamic scaling of cooking robots.

#### Scenario: Add Bot
- **WHEN** user clicks "+ Bot"
- **THEN** system SHALL create a new bot
- **AND** bot SHALL immediately start processing orders in PENDING area
- **AND** processing time SHALL be 10 seconds
- **AND** order SHALL move to COMPLETE area after completion

#### Scenario: Remove Bot
- **WHEN** user clicks "- Bot"
- **THEN** system SHALL destroy the newest bot
- **AND** if bot is processing an order, order SHALL return to its original position in PENDING area

#### Scenario: Bot Idle
- **GIVEN** no orders in PENDING area
- **WHEN** bot completes current order
- **THEN** bot SHALL enter IDLE state
- **AND** automatically resume processing when new orders arrive

### Requirement: Priority Queue
The system SHALL implement VIP-priority order queue.

#### Scenario: VIP Priority
- **GIVEN** normal orders and VIP orders in PENDING area
- **WHEN** bot selects next order
- **THEN** prioritize earliest VIP order
- **AND** select earliest normal order when no VIP orders exist

#### Scenario: Same Type FIFO
- **GIVEN** multiple orders of same type in PENDING area
- **WHEN** bot selects order
- **THEN** process in first-in-first-out order

### Requirement: CLI Output
The system SHALL provide timestamped CLI output.

#### Scenario: Output Format
- **WHEN** system performs operations
- **THEN** output SHALL include HH:MM:SS format timestamp
- **AND** output SHALL be saved to result.txt

## MODIFIED Requirements
None

## REMOVED Requirements
None

## Project Advantages

### 1. Functional Implementation Advantages
- **Priority Queue**: Implements VIP-priority order processing mechanism to ensure important customers receive faster service
- **Dynamic Robot Management**: Supports real-time robot scaling to flexibly adjust processing capacity based on order volume
- **Batch Operation Support**: Commands support 1-10 quantity parameters to improve operation efficiency
- **Real-time Status Monitoring**: Automatically displays system status after each command execution, providing immediate feedback

### 2. Performance Advantages
- **High-concurrency ID Generation**: Uses snowflake algorithm, supports millions of people placing orders simultaneously, order numbers are globally unique and increasing
- **Priority Queue Optimization**: Heap-based priority queue with O(log n) time complexity for order insertion and retrieval
- **Event-driven Architecture**: Uses context and ticker for efficient robot scheduling
- **Cross-platform Support**: Compatible with Windows, Linux, macOS and other operating systems

### 3. User Experience Advantages
- **Intuitive CLI Interface**: Provides clean and clear command-line interaction, supports command history and help information
- **Detailed Status Output**: Displays detailed information about robot status, pending orders and completed orders
- **Friendly Error Messages**: Provides clear error messages for invalid commands and parameters
- **Batch Operation Feedback**: Shows detailed results for each operation during batch creation or deletion

### 4. System Reliability Advantages
- **Graceful Shutdown**: Supports system graceful shutdown to ensure processing orders are not lost
- **Error Handling Mechanism**: Comprehensive error handling to ensure system stability
- **Data Consistency**: Ensures processing orders return to queue when robots are removed, avoiding order loss
- **Testability**: Comprehensive unit tests and integration tests to ensure system quality

### 5. Scalability Advantages
- **DDD Architecture**: Adopts domain-driven design with clear code structure, easy to maintain and extend
- **Modular Design**: Clear responsibilities for each component, easy for independent development and testing
- **Interface Abstraction**: Supports replacement of different implementations through interface definitions
- **Configuration Flexibility**: Supports system behavior adjustment through command-line parameters