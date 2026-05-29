## ADDED Requirements

### Requirement: Add bots on demand
The system MUST create bots dynamically and immediately try to process pending orders.

#### Scenario: New bot starts processing immediately
- **GIVEN** there is at least one pending order
- **WHEN** a bot is added
- **THEN** the newest bot begins processing the highest-priority pending order immediately.

#### Scenario: New bot becomes idle when no work is pending
- **WHEN** a bot is added while the pending queue is empty
- **THEN** the bot is created in an idle state.

### Requirement: Remove the latest bot safely
The system MUST remove the most recently created active bot and restore any interrupted work.

#### Scenario: Removing an idle latest bot
- **GIVEN** the latest bot is idle
- **WHEN** the operator removes the latest bot
- **THEN** the bot is removed from the system
- **AND** no orders change state.

#### Scenario: Removing a processing latest bot
- **GIVEN** the latest bot is processing an order
- **WHEN** the operator removes the latest bot
- **THEN** the in-flight timer is cancelled
- **AND** the order returns to the pending queue using the VIP-before-normal rule
- **AND** the bot no longer appears in the active bot list.
