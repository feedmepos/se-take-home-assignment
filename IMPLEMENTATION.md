# McDonald's Order Control System - Implementation Documentation

## Overview
This is a backend CLI application that implements an automated order control system for McDonald's cooking bots.

## Architecture

### Core Components

1. **OrderController** - Main controller managing orders and bots
    - Thread-safe operations using mutex
    - Priority queue for VIP orders
    - Bot lifecycle management

2. **Order** - Represents a customer order
    - Unique incremental ID
    - Type: Normal or VIP
    - Status: Pending, Processing, or Complete

3. **Bot** - Represents a cooking bot
    - Processes one order at a time
    - 10 seconds processing time per order
    - Can be dynamically added/removed

## Key Features

### VIP Priority Queue
- VIP orders are always placed before Normal orders
- Multiple VIP orders maintain their arrival order
- Implemented using intelligent insertion in the pending queue

### Dynamic Bot Management
- **Add Bot**: Immediately starts processing pending orders if available
- **Remove Bot**: Removes the newest bot; if processing, order returns to its original priority position

### Thread Safety
- All operations are protected by mutex locks
- Goroutines handle asynchronous order processing
- Proper lock management to prevent deadlocks

## Running the Application

### Prerequisites
- Go 1.23.9 or later

### Build
