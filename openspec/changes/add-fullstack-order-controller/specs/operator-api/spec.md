## ADDED Requirements

### Requirement: Expose state to operators
The backend MUST expose the current controller snapshot to external clients.

#### Scenario: Fetching the current state
- **WHEN** a client requests the current state
- **THEN** the API returns orders grouped by status, bot data, server time, and metrics.

### Requirement: Stream controller events
The backend MUST stream real-time controller events to subscribed clients.

#### Scenario: Client subscribes to the event stream
- **WHEN** a client connects to the events endpoint
- **THEN** the server keeps the connection open
- **AND** publishes controller events with timestamps, human-readable messages, and a fresh snapshot.

### Requirement: Reject invalid bot removal
The backend MUST return an explainable error when no bot is available to remove.

#### Scenario: Removing a bot from an empty system
- **WHEN** a client requests removal of the latest bot and no bots exist
- **THEN** the API returns a client error response
- **AND** includes a descriptive message.
