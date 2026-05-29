## ADDED Requirements

### Requirement: Provide a unified operator console
The frontend MUST present customer and manager actions in one page without duplicating backend rules in the browser.

#### Scenario: Customer and manager actions are visible together
- **WHEN** the console loads on desktop
- **THEN** the page shows explicit "Customer Actions" and "Manager Actions" sections
- **AND** the same screen exposes pending, processing, complete, and bot state.

### Requirement: Show live metrics and connection status
The frontend MUST keep operators informed about system health and live updates.

#### Scenario: Showing lightweight statistics
- **WHEN** the console renders a snapshot
- **THEN** it displays counts for pending, processing, complete, and bot states
- **AND** lightweight metrics such as VIP/normal mix, average processing time, utilization, and completion rate.

#### Scenario: Reconnecting after event stream interruption
- **WHEN** the live event stream disconnects
- **THEN** the console shows a reconnecting status
- **AND** automatically retries and refreshes state once the connection returns.
