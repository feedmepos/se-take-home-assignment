# FeedMe - McDonald's Automated Order Management System

## Overview

FeedMe is a Flutter-based frontend solution for managing automated cooking bot operations in a McDonald's restaurant. The application demonstrates a complete order management system with priority-based queue handling, bot resource management, and real-time order tracking.

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── app.dart                  # Material app configuration
├── models/
│   └── order.dart           # Order and Bot data models
├── services/
│   └── order_controller.dart # Business logic & state management
└── screens/
    ├── home_screen.dart     # Main UI screen
    └── widgets/
        ├── order_card.dart  # Order display component
        └── bot_status.dart  # Bot status display component
```

## Key Features

### 1. **Order Management**
- **Normal Orders**: Standard customers' orders processed in FIFO manner
- **VIP Orders**: Priority processing (VIP orders processed before normal orders)
- **Order States**: PENDING → COMPLETE
- **Unique Ordering**: Orders maintain VIP-first priority while respecting insertion order within priority level

### 2. **Bot Management**
- **Add Bot**: Create new bot instantly (begins processing immediately if orders pending)
- **Remove Bot**: Removes newest bot (returns active order to PENDING queue)
- **Processing Time**: Each order takes exactly 10 seconds
- **Idle State**: Bots become IDLE when no orders available

### 3. **Real-time UI Updates**
- Live order queue display (Pending & Complete areas)
- Bot status visualization with processing indicators
- Statistics dashboard (total orders, pending count, active bots)
- Timestamp tracking for order creation and completion

### 4. **State Management**
- Provider pattern for reactive UI updates
- OrderController manages all business logic
- In-memory data persistence (no database needed)

## Requirements Met

✅ **New Normal Order** - Adds order to pending queue  
✅ **New VIP Order** - Adds VIP order with priority (before all normal, after existing VIP)  
✅ **Unique Order ID** - Auto-incrementing order IDs  
✅ **Bot Processing** - Processes orders in 10-second intervals  
✅ **Bot Addition** - Immediately begins processing pending orders  
✅ **Bot Removal** - Newest bot removed; active order returns to queue with priority preserved  
✅ **Order Priority** - VIP orders always processed before normal orders  
✅ **Timestamps** - Shows creation and completion times in HH:MM:SS format  

## How to Run

### Prerequisites
- Flutter SDK (3.0.0 or higher)
- iOS (iOS 11+) or Android (API 21+) device/emulator

### Installation & Execution

```bash
# Navigate to project directory
cd /Users/nabila/Documents/Personal_Projects/Mobile/FeedMe

# Install dependencies
flutter pub get

# Run the app (for web)
flutter run -d chrome

# Or for mobile emulator
flutter run

# To build for release
flutter build web    # For web deployment
flutter build ios    # For iOS
flutter build apk    # For Android
```

## Usage Guide

### Creating Orders
1. Click **"New Normal Order"** button to add a normal customer order
2. Click **"New VIP Order"** button to add a VIP member order
   - VIP orders appear before all normal orders but after existing VIP orders

### Managing Bots
1. Click **"+ Bot"** to create a new cooking bot
   - Bot automatically starts processing next pending order
2. Click **"- Bot"** to remove the newest bot
   - If bot is processing an order, that order returns to pending queue

### Monitoring
- **PENDING ORDERS**: Shows orders waiting to be processed
- **COMPLETE ORDERS**: Shows finished orders with completion timestamps
- **Status Panel**: Shows number of active bots and processing status

## Technical Details

### Order Priority Algorithm

```
When adding VIP order:
1. Find insertion point: after all existing VIP orders
2. If found VIP orders: insert after the last VIP order
3. Otherwise: insert at beginning

When returning order to queue (bot removal):
- Preserve original priority type (VIP/Normal)
- Insert at correct position based on type and order
```

### Bot Processing Cycle

```
1. Bot checks for pending orders
2. If pending orders exist:
   - Pick first order from queue
   - Mark as processing
   - Start 10-second timer
3. On completion:
   - Move order to complete
   - Mark order with completion timestamp
   - Check for next pending order
4. Loop until no pending orders (becomes IDLE)
```

### Data Models

#### Order
```dart
- id: int (unique, auto-increment)
- type: OrderType (NORMAL or VIP)
- status: OrderStatus (PENDING or COMPLETE)
- createdAt: DateTime
- completedAt: DateTime? (null if not completed)
```

#### Bot
```dart
- id: int (unique, auto-increment)
- currentOrder: Order? (active order, null if IDLE)
- isIdle: bool
- processingStartedAt: DateTime?
```

## Code Quality & Best Practices

✅ **Clean Code**: Single responsibility principle for each component  
✅ **Reactive UI**: Provider pattern for state management  
✅ **Type Safety**: Full null safety with Dart  
✅ **Modularity**: Separated models, services, and UI layers  
✅ **Documentation**: Clear comments and self-documenting code  
✅ **Error Handling**: Graceful handling of edge cases (empty queues, bot removal)  

## Testing Scenarios

### Scenario 1: Basic Order Processing
1. Create 3 normal orders
2. Add 1 bot
3. Verify: Orders move to COMPLETE in FIFO order with 10-second intervals
4. Check: Timestamps increment correctly

### Scenario 2: VIP Priority
1. Create normal order #1
2. Create VIP order #1
3. Create normal order #2
4. Add 1 bot
5. Verify: VIP order processes first, then normal orders in order

### Scenario 3: Multiple Bots
1. Create 5 orders (mix of VIP and normal)
2. Add 3 bots
3. Verify: 3 orders process simultaneously
4. Check: 4th and 5th orders start when any bot completes

### Scenario 4: Bot Removal
1. Create 2 orders
2. Add 1 bot (processing order 1)
3. Create order 3
4. Remove bot (order 1 returns to pending)
5. Add 1 bot
6. Verify: Bot processes order 1 again with priority preserved

### Scenario 5: VIP Queue Management
1. Create normal order #1
2. Add 1 bot (processing order 1)
3. Create VIP order #1
4. Create VIP order #2
5. Create normal order #2
6. Remove bot (order 1 returns)
7. Add bot
8. Verify processing order: Normal #1 → VIP #1 → VIP #2 → Normal #2

## Deployment

### For Web Deployment
```bash
# Build web version
flutter build web

# Deploy to Firebase Hosting
firebase deploy

# Or use any static hosting (Vercel, Netlify, GitHub Pages)
```

### For Mobile Deployment
- iOS: Build and deploy via TestFlight or App Store
- Android: Build APK/AAB and deploy via Google Play Store

## Future Enhancements

- Database persistence (Firebase, SQLite)
- Multi-restaurant management
- Advanced scheduling algorithms
- Analytics & reporting dashboard
- Push notifications for order completion
- Customer tracking system
- Integration with POS system

## Support & Questions

For clarifications during the interview:
- The algorithm prioritizes VIP orders globally while maintaining queue order within each priority level
- Bot removal instantly stops processing; the order is returned to the queue
- All timestamps use 24-hour HH:MM:SS format
- No external APIs are called; everything runs in-memory

---

**Project Completion Date**: May 29, 2026  
**Framework**: Flutter 3.0+  
**State Management**: Provider 6.0+  
**Development Time**: ~1 hour (optimized implementation)
