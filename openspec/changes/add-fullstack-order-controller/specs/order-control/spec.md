## ADDED Requirements

### Requirement: Create and queue orders
The system MUST create increasing order ids and place new orders into the pending queue according to priority rules.

#### Scenario: Normal order enters the queue
- **WHEN** an operator creates a normal order
- **THEN** the system creates a unique increasing order id
- **AND** the order appears in the pending queue after all existing pending orders.

#### Scenario: VIP order is inserted ahead of normal orders
- **WHEN** an operator creates a VIP order
- **THEN** the system creates a unique increasing order id
- **AND** the order is inserted after the last pending VIP order
- **AND** before every pending normal order.

### Requirement: Track order lifecycle
The system MUST expose pending, processing, and complete order collections.

#### Scenario: Order moves to processing
- **GIVEN** a pending order and an available bot
- **WHEN** the controller assigns the order
- **THEN** the order leaves the pending queue
- **AND** appears in the processing collection with the assigned bot id.

#### Scenario: Order completes after the configured duration
- **GIVEN** a processing order
- **WHEN** ten seconds of processing elapse
- **THEN** the order moves to the complete collection
- **AND** includes a completion timestamp.
