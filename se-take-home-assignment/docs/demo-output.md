# CLI Demo Output

## GitHub Actions Verification

All CI checks passed: https://github.com/joveliujun/se-take-home-assignment/actions

## Demo Script

```bash
./scripts/test.sh   # Run unit tests
./scripts/build.sh  # Build CLI
./scripts/run.sh    # Generate result.txt
```

## Sample Output

```
McDonald's Order Management System - Simulation Results

[14:32:01] System initialized with 0 bots
[14:32:01] Created Normal Order #1001 - Status: PENDING
[14:32:02] Created VIP Order #1002 - Status: PENDING
[14:32:02] Created Normal Order #1003 - Status: PENDING
[14:32:03] Bot #1 created - Status: ACTIVE
[14:32:03] Bot #1 picked up VIP Order #1002 - Status: PROCESSING
[14:32:04] Bot #2 created - Status: ACTIVE
[14:32:04] Bot #2 picked up Normal Order #1001 - Status: PROCESSING
[14:32:13] Bot #1 completed VIP Order #1002 - Status: COMPLETE (Processing time: 10s)
[14:32:13] Bot #1 picked up Normal Order #1003 - Status: PROCESSING
[14:32:14] Bot #2 completed Normal Order #1001 - Status: COMPLETE (Processing time: 10s)
[14:32:14] Bot #2 is now IDLE - No pending orders
[14:32:15] Created VIP Order #1004 - Status: PENDING
[14:32:15] Bot #2 picked up VIP Order #1004 - Status: PROCESSING
[14:32:23] Bot #1 completed Normal Order #1003 - Status: COMPLETE (Processing time: 10s)
[14:32:25] Bot #2 completed VIP Order #1004 - Status: COMPLETE (Processing time: 10s)
[14:32:25] Bot #2 destroyed while IDLE
[14:32:26] Bot #1 is now IDLE - No pending orders

Final Status:
- Total Orders Processed: 4 (2 VIP, 2 Normal)
- Orders Completed: 4
- Active Bots: 1
- Pending Orders: 0
```

## Features Demonstrated

| Feature | Evidence |
|---------|----------|
| VIP Priority | Order #1002 (VIP) processed before #1001, #1003 (Normal) |
| 10-second processing | Completion at +10s from pickup |
| Multiple bots | Bot #1 and #2 working in parallel |
| Bot removal | Bot #2 removed while idle |
| Timestamp format | HH:MM:SS format verified |
