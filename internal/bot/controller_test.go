package bot

import (
	"context"
	"main/internal/order"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func newBotControllerWithBots(oc *order.OrderController, numBots int) *BotController {
	bm := NewBotController(oc)

	for range numBots {
		bm.AddBot()
	}

	return bm
}

func TestBotController_New(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 0)

	assert.Len(t, bm.bots, 0, "Initial bots should be 0")
	assert.Equal(t, 0, bm.botCounter, "Initial bot counter should be 0")
	assert.NotNil(t, bm.oc, "Order controller should not be nil")
}

func TestBotController_AddBot(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 0)

	bm.AddBot()
	bm.AddBot()
	bm.AddBot()

	assert.Len(t, bm.bots, 3, "Bots should be 3 after adding three bots")
	assert.Equal(t, 3, bm.botCounter, "Bot counter should be 3 after adding three bots")

	expectedIDs := []int{1, 2, 3}
	for i, bot := range bm.bots {
		assert.Equal(t, expectedIDs[i], bot.ID, "Bot ID should match expected sequence")
		assert.Equal(t, Idle, bot.Status, "Bot status should be Idle")
		assert.Nil(t, bot.CurrentOrder, "Bot current order should be nil")
		assert.NotNil(t, bot.cancel, "Bot cancel function should not be nil")
	}
}

func TestBotController_RemoveBot(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 2)

	bm.RemoveBot()

	assert.Len(t, bm.bots, 1, "Bots should be 1 after removing one bot")
	assert.Equal(t, 1, bm.bots[0].ID, "Remaining bot should be bot #1")
}

func TestBotController_RemoveBotFromEmptyList(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 0)

	assert.NotPanics(t, func() { bm.RemoveBot() })

	assert.Len(t, bm.bots, 0, "Bots should remain 0 after removing from empty list")
	assert.Equal(t, 0, bm.botCounter, "Bot counter should remain 0")
}

func TestBotController_RemoveBotCancelProcessing(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 1)

	bm.oc.CreateOrder(order.Normal)

	time.Sleep(2 * time.Second)

	bot := bm.bots[0]
	currentOrder := bot.CurrentOrder

	assert.NotNil(t, currentOrder, "Bot should have picked up the order")
	assert.Equal(t, order.Processing, currentOrder.Status, "Order should be processing")
	assert.Equal(t, Processing, bot.Status, "Bot should be processing")

	bm.RemoveBot()

	// Verify the order was requeued
	assert.Len(t, bm.bots, 0, "Bots should be 0 after removing bot")
	assert.Equal(t, order.Pending, currentOrder.Status, "Requeued order status should be Pending")
}

func TestBotController_GetActiveBotsCount(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 0)

	assert.Equal(t, 0, bm.GetActiveBotsCount(), "Active bots count should be 0 initially")

	bm.AddBot()
	assert.Equal(t, 1, bm.GetActiveBotsCount(), "Active bots count should be 1 after adding a bot")

	bm.AddBot()
	bm.AddBot()
	assert.Equal(t, 3, bm.GetActiveBotsCount(), "Active bots count should be 3 after adding three bots")

	bm.RemoveBot()
	assert.Equal(t, 2, bm.GetActiveBotsCount(), "Active bots count should be 2 after removing one bot")

	bm.RemoveBot()
	bm.RemoveBot()
	assert.Equal(t, 0, bm.GetActiveBotsCount(), "Active bots count should be 0 after removing all bots")
}

func TestBotController_RunBotWaitForOrderIndefinitelyUntilCancel(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 0)

	ctx, cancel := context.WithCancel(context.Background())
	targetBot := &Bot{
		ID:     1,
		Status: Idle,
	}

	done := make(chan bool, 1)
	go func() {
		bm.runBot(ctx, targetBot)
		done <- true
	}()

	assert.Eventually(t, func() bool {
		return targetBot.Status == Idle
	}, 100*time.Millisecond, 1*time.Millisecond, "Bot should be Idle waiting for orders")

	cancel()

	select {
	case <-done:
		// Successfully demo an indefinite wait and exit on cancel
	case <-time.After(500 * time.Millisecond):
		assert.Fail(t, "runBot did not exit within timeout after context cancellation")
	}
}

func TestBotController_RunBotProcessOrderAndCancel(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 0)

	bm.oc.CreateOrder(order.Normal)

	ctx, cancel := context.WithCancel(context.Background())
	targetBot := &Bot{
		ID:     1,
		Status: Idle,
	}

	go bm.runBot(ctx, targetBot)

	// Use assert.Eventually to wait for bot to pick up the order
	assert.Eventually(t, func() bool {
		return targetBot.Status == Processing
	}, 100*time.Millisecond, 1*time.Millisecond, "Bot should pick up order")

	cancel()

	select {
	case <-ctx.Done():
		assert.EventuallyWithT(t, func(c *assert.CollectT) {
			assert.Equal(c, Idle, targetBot.Status, "Bot should be idle after processing")
		}, 100*time.Millisecond, 1*time.Millisecond, "Order processing should complete")
	case <-time.After(500 * time.Millisecond):
		assert.Fail(t, "runBot did not exit within timeout after context cancellation")
	}
}

func TestBotController_ProcessOrder(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 0)

	bm.oc.CreateOrder(order.Normal)
	targetOrder := bm.oc.GetNextPendingOrder()
	ctx := context.Background()
	targetBot := &Bot{
		ID:     1,
		Status: Idle,
	}

	done := make(chan bool, 1)
	var timeStarted time.Time
	go func() {
		timeStarted = time.Now()
		bm.processOrder(ctx, targetBot, targetOrder)
		done <- true
	}()

	// Wait for the order to start processing
	assert.EventuallyWithT(t, func(c *assert.CollectT) {
		assert.Equal(c, Processing, targetBot.Status, "Bot should be processing the order")
		assert.Equal(c, targetOrder, targetBot.CurrentOrder, "Bot's current order should match the target order")
		assert.Equal(c, order.Processing, targetOrder.Status, "Order status should be Processing")
	}, 100*time.Millisecond, 1*time.Millisecond, "Bot should pick up order")

	select {
	case <-done:
		assert.InDelta(t, botProcessingTime.Seconds(), time.Since(timeStarted).Seconds(), 0.01, "Order processing should take approximately 10 seconds")
		assert.Equal(t, Idle, targetBot.Status, "Bot should be idle after processing")
		assert.Nil(t, targetBot.CurrentOrder, "Bot's current order should be nil after processing")
		assert.Equal(t, order.Completed, targetOrder.Status, "Order status should be Completed")
	case <-time.After(11 * time.Second):
		assert.Fail(t, "processOrder did not complete after processing order")
	}
}

func TestBotController_ProcessOrderCancel(t *testing.T) {
	bm := newBotControllerWithBots(order.NewOrderController(), 0)

	bm.oc.CreateOrder(order.Normal)
	targetOrder := bm.oc.GetNextPendingOrder()
	ctx, cancel := context.WithCancel(context.Background())
	targetBot := &Bot{
		ID:     1,
		Status: Idle,
	}

	go bm.processOrder(ctx, targetBot, targetOrder)

	// Wait for the order to start processing
	assert.EventuallyWithT(t, func(c *assert.CollectT) {
		assert.Equal(c, Processing, targetBot.Status, "Bot should be processing the order")
		assert.Equal(c, targetOrder, targetBot.CurrentOrder, "Bot's current order should match the target order")
		assert.Equal(c, order.Processing, targetOrder.Status, "Order status should be Processing")
	}, 100*time.Millisecond, 1*time.Millisecond, "Bot should pick up order")

	// Allow bot to process for order for 2 seconds
	time.Sleep(2 * time.Second)

	cancel()

	select {
	case <-ctx.Done():
		assert.EventuallyWithT(t, func(c *assert.CollectT) {
			assert.Equal(c, Idle, targetBot.Status, "Bot should be idle after processing")
			assert.Nil(c, targetBot.CurrentOrder, "Bot's current order should be nil after processing")
		}, 100*time.Millisecond, 1*time.Millisecond, "Order processing should complete")
	case <-time.After(500 * time.Millisecond):
		assert.Fail(t, "processOrder did not exit after context cancellation")
	}
}

func TestBotController_ResetBotToIdle(t *testing.T) {
	bot := &Bot{
		ID:     1,
		Status: Processing,
		CurrentOrder: &order.Order{
			ID:     1,
			Type:   order.Normal,
			Status: order.Processing,
		},
	}

	resetBotToIdle(bot)

	assert.Equal(t, Idle, bot.Status, "Bot status should be reset to Idle")
	assert.Nil(t, bot.CurrentOrder, "Bot current order should be nil after reset")
}
