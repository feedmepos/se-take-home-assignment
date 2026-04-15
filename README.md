# McDonald's Order Management System - Usage Guide

## Overview

This is an interactive CLI application for McDonald's Order Management System that allows you to:
- Create Normal and VIP orders
- Add/remove cooking bots
- View pending and completed orders
- Process orders automatically (10 seconds per order)
- Log all activities with timestamps

## Getting Started

### Prerequisites
- Go 1.26 or higher

### Installation

Install Go dependencies (if needed):
```bash
go mod download
```

### Running the Application

#### Option 1: Direct Interactive Mode
```bash
go run main.go
```

Then interact with the menu:
```
Commands:
  1 - Create Normal Order
  2 - Create VIP Order
  3 - Add Bot (+Bot)
  4 - Remove Bot (-Bot)
  5 - Show Menu
  6 - Exit
```

#### Option 2: Run with Script
```bash
bash scripts/run.sh
```

This script demonstrates:
- Creating 3 normal and 2 VIP orders
- Adding 2 bots
- Processing orders for 12 seconds
- Viewing results
- Exiting and logging final status

## Features

### Order Management
- **Create Normal Order** - Creates a standard customer order
- **Create VIP Order** - Creates a priority VIP order (processed before normal orders)
- VIP orders automatically position before the first normal order in the queue

### Bot Management
- **Add Bot** - Creates a new bot with unique ID
- **Remove Bot** - Removes the newest (last) bot
  - If bot is processing an order, the order returns to pending with correct priority
  - If bot is idle, it's simply removed

### Order Processing
- Each order takes exactly 10 seconds to process
- Bots automatically pick up orders from the pending queue
- When a bot finishes, it automatically picks up the next pending order
- If no pending orders exist, bot becomes IDLE

### Viewing Status
- **View Pending Orders** - Shows all orders waiting to be processed
- **View Complete Orders** - Shows all successfully completed orders
- **View Active Bots** - Shows all bots with their current status (IDLE or PROCESSING)

## Running Tests

### Run All Unit Tests
```bash
bash scripts/test.sh
```

Or directly:
```bash
go test -v ./mcdonald
```

### Test Coverage
- **CreateOrder Tests** - Order creation, prioritization, and assignment
- **AddCookingBot Tests** - Bot creation, concurrent operations
- **RemoveCookingBot Tests** - Bot removal, order return handling
- **Logger Tests** - File logging, timestamps, concurrent logging

## Output Files

### Result Logging
All activities are logged to `scripts/result.txt` with timestamps in HH:MM:SS format:

Example:
```
McDonald's Order Management System - Simulation Results

[14:32:01] Created normal Order #1001 - Status: PENDING
[14:32:01] Bot #1 created - Status: ACTIVE
[14:32:01] Bot #1 picked up normal Order #1001 - Status: PROCESSING
[14:32:11] Order ID #1001 for normal customer completed by Bot #1 in 10 seconds - Status: COMPLETE

Final Status:
- Total Orders Processed: 4 (2 VIP, 2 Normal)
- Orders Completed: 4
- Active Bots: 1
- Pending Orders: 0
```

## Project Structure
```
feedme-se-requirement/
├── main.go                      # CLI application entry point
├── mcdonald/
│   ├── mcdonald.go             # Main system structure
│   ├── order.go                # Order types and constants
│   ├── bot.go                  # Bot types and structure
│   ├── customer.go             # Customer types
│   ├── create_order.go         # Order creation logic
│   ├── add_cooking_bot.go      # Bot addition logic
│   ├── remove_cooking_bot.go   # Bot removal logic
│   ├── logger.go               # Logging functionality
│   ├── mcdonald_test.go        # Main tests
│   ├── create_order_test.go    # CreateOrder tests
│   ├── remove_cooking_bot_test.go # RemoveCookingBot tests
│   └── logger_test.go          # Logger tests
├── scripts/
│   ├── build.sh                # Build script
│   ├── test.sh                 # Test script
│   ├── run.sh                  # demo script
│   └── result.txt              # Output log file
├── go.mod                       # Go module definition
```


