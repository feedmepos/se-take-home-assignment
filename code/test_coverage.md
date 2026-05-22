Test Coverage Topics
====================

Order Tests (order_test.go)
---------------------------
TestCreateNormalOrder          - Creating NORMAL orders
TestCreateVIPOrder             - Creating VIP orders
TestInvalidOrderType           - Error handling for invalid order types
TestOrderIDIncrements          - Auto-incrementing order IDs
TestGetNextOrderFromEmptyQueue - Empty queue behavior
TestGetNextOrderPriority       - VIP priority over NORMAL
TestGetNextOrderNormalOnly     - Normal queue processing
TestGetNextOrderVIPOnly        - VIP queue processing
TestFIFOWithinSameType         - FIFO ordering within same priority
TestMixedQueueOrdering         - Mixed VIP/NORMAL ordering

Bot Tests (bot_test.go)
-----------------------
TestAddBot                     - Adding bots to fleet
TestRemoveBot                  - Removing bots (LIFO)
TestRemoveBotWhenEmpty         - Removing from empty fleet
TestBotProcessesOrder          - End-to-end order processing (10s)
TestBotReturnsOrderWhenRemoved - Order returned when bot destroyed mid-processing
TestBotDoesNotTakeOrderWhenBusy - Busy flag prevents multiple orders
TestVIPOrderPriority           - VIP picked before NORMAL
TestOrderNotProcessedTwice     - Same order cannot be processed by multiple bots

Key Behaviors Tested
--------------------
1. Order Management: Creation, validation, ID sequencing
2. Priority Queue: VIP first, FIFO within same type
3. Bot Lifecycle: Add/remove, graceful shutdown
4. Concurrency Safety: Busy flag, order return on interruption
5. Race Condition Prevention: Single order processing guarantee
6. End-to-End Flow: Full order processing cycle
