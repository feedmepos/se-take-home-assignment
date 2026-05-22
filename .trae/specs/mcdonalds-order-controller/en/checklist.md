# Checklist

## Domain Model
- [x] Order entity correctly defined (ID, Type, Status, CreatedAt)
- [x] OrderType value object correctly defined (Normal=0, VIP=1)
- [x] OrderStatus value object correctly defined (Pending, Processing, Complete)
- [x] Order status flow logic correctly implemented

## ID Generator
- [x] Snowflake algorithm correctly implemented
- [x] Support for RestaurantID isolation
- [x] Thread-safe (millions of people placing orders simultaneously)
- [x] Generated IDs are globally unique and increasing

## Priority Queue
- [x] VIP orders have priority over normal orders
- [x] Same type orders processed in FIFO order
- [x] Orders can return to original position when bots are removed
- [x] Thread-safe implementation

## Cooking Robots
- [x] Bot entity correctly defined (ID, Status, CurrentOrder)
- [x] Order processing time is 10 seconds
- [x] Supports Idle and Processing states
- [x] Can correctly handle order completion and status changes

## Robot Scheduler
- [x] Supports dynamic bot addition
- [x] Supports dynamic bot removal (processing orders return to queue)
- [x] Automatically assigns orders to idle bots
- [x] Correctly handles concurrent bot addition/removal

## Application Services
- [x] OrderService can create normal orders
- [x] OrderService can create VIP orders
- [x] BotService can add bots
- [x] BotService can remove bots
- [x] Query service can correctly return system status

## CLI Interface
- [x] Supports new-normal command
- [x] Supports new-vip command
- [x] Supports +bot command
- [x] Supports -bot command
- [x] Supports status command
- [x] Output includes HH:MM:SS timestamp
- [x] Output saved to result.txt

## Script Files
- [x] scripts/test.sh can run all unit tests
- [x] scripts/build.sh can compile CLI application
- [x] scripts/run.sh can run CLI and generate result.txt

## GitHub Actions
- [x] test.sh execution passes
- [x] build.sh execution passes
- [x] run.sh execution passes
- [x] result.txt exists and is not empty
- [x] result.txt contains HH:MM:SS timestamps