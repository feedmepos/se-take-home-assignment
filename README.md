# McDonald's AutoCook

A CLI application that simulates an automated order processing system for McDonald's using cooking bots.

## Overview

The system manages customer orders with priority-based queueing (VIP orders processed before normal orders) and dynamic bot management. Orders are processed by bots that take 10 seconds per order.

## Features

- **Order Management**: Create normal and VIP orders with unique, incrementing order numbers
- **Priority Queueing**: VIP orders jump ahead of normal orders but maintain FIFO within their tier
- **Dynamic Bot Scaling**: Add or remove bots on the fly
- **Order Status Tracking**: Orders flow from PENDING → PROCESSING → COMPLETE
- **Real-time Processing**: Bots automatically pick up pending orders when available

## Requirements

- Go 1.25.6+
- In-memory storage (no persistence)

## Usage

### Scripts

- `scripts/test.sh` - Run unit tests
- `scripts/build.sh` - Build the CLI application
- `scripts/run.sh` - Execute the simulation

### Output

Results are written to `result.txt` with timestamps in HH:MM:SS format.

## Architecture

Clean architecture with three main layers:

- **Domain**: Entities and business logic (use cases)
- **Data**: In-memory repositories and models
- **Presentation**: CLI interface and output handling
