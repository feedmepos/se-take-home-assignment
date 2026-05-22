# Test Plan: Manual QA for FeedMe POS

## Objective
Verify all use cases (UC-01 to UC-14) defined in `TEST.md` for the FeedMe POS application running at http://localhost:3000.

## Test Environment
- URL: http://localhost:3000
- Accounts: `normal_user`, `vip_user`, `manager` (password: `password123`)

## Test Steps

### Phase 1: Authentication and Basic Order Flow (UC-01, UC-02, UC-05)
1. Log in as `normal_user`.
2. Verify role "NORMAL" in header.
3. Create 3 Normal Orders.
4. Verify order numbers are unique and increasing.
5. Logout.

### Phase 2: VIP Priority and Queueing (UC-03, UC-04, UC-13)
1. Log in as `manager`.
2. Clear/Ensure some Normal orders are Pending.
3. Create a VIP order.
4. Verify VIP order is at the top of the Pending list (ahead of Normal).
5. Create another VIP order.
6. Verify VIP order B is behind VIP order A but ahead of Normal orders.
7. Logout.

### Phase 3: Bot Management and Processing (UC-06, UC-07, UC-08, UC-09, UC-10, UC-14)
1. Log in as `manager`.
2. Ensure there are Pending orders.
3. Add a Bot.
4. Verify Bot starts processing (Status Processing).
5. Wait ~10s and verify it moves to Complete.
6. Verify Bot automatically picks up the next Pending order.
7. Add a second Bot.
8. Verify both process orders simultaneously (if available).
9. Wait for all orders to complete and verify Bot status becomes IDLE.

### Phase 4: Bot Removal and Error Handling (UC-11, UC-12)
1. Add two bots and create two Pending orders.
2. While both bots are Processing, click "Remove Bot".
3. Verify the newest bot is removed and its order is returned to Pending.
4. Wait for all bots to be IDLE.
5. Click "Remove Bot".
6. Verify the bot is removed without affecting orders.

## Documentation
- Results will be recorded in `TEST.md`.
