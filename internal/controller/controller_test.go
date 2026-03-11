package controller

import (
	"mcdonalds-order-system/internal/model"
	"testing"
	"time"
)

func noopLogger(format string, args ...interface{}) {}

// testProcessingTime is a short duration for faster tests
const testProcessingTime = 100 * time.Millisecond

func newTestController() *Controller {
	return NewController(
		WithLogger(noopLogger),
		WithProcessingTime(testProcessingTime),
	)
}

func TestAddNormalOrder(t *testing.T) {
	ctrl := newTestController()

	order := ctrl.AddNormalOrder()

	if order.Type != model.OrderTypeNormal {
		t.Errorf("Expected Normal order, got %s", order.Type)
	}
	if order.Status != model.OrderStatusPending {
		t.Errorf("Expected PENDING status, got %s", order.Status)
	}
}

func TestAddVIPOrder(t *testing.T) {
	ctrl := newTestController()

	order := ctrl.AddVIPOrder()

	if order.Type != model.OrderTypeVIP {
		t.Errorf("Expected VIP order, got %s", order.Type)
	}
}

func TestOrderIDIncreasing(t *testing.T) {
	ctrl := newTestController()

	order1 := ctrl.AddNormalOrder()
	order2 := ctrl.AddVIPOrder()
	order3 := ctrl.AddNormalOrder()

	if order2.ID <= order1.ID {
		t.Errorf("Order IDs should be increasing: %d <= %d", order2.ID, order1.ID)
	}
	if order3.ID <= order2.ID {
		t.Errorf("Order IDs should be increasing: %d <= %d", order3.ID, order2.ID)
	}
}

func TestAddBot(t *testing.T) {
	ctrl := newTestController()

	bot := ctrl.AddBot()

	if bot.ID != 1 {
		t.Errorf("Expected bot ID 1, got %d", bot.ID)
	}

	bots := ctrl.GetBots()
	if len(bots) != 1 {
		t.Errorf("Expected 1 bot, got %d", len(bots))
	}
}

func TestRemoveBot(t *testing.T) {
	ctrl := newTestController()

	ctrl.AddBot()
	ctrl.AddBot()

	bots := ctrl.GetBots()
	if len(bots) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(bots))
	}

	ctrl.RemoveBot()

	bots = ctrl.GetBots()
	if len(bots) != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", len(bots))
	}
}

func TestVIPPriorityInProcessing(t *testing.T) {
	ctrl := newTestController()

	// Add orders: Normal, VIP, Normal
	ctrl.AddNormalOrder()          // Should be second
	vipOrder := ctrl.AddVIPOrder() // Should be first
	ctrl.AddNormalOrder()          // Should be third

	// Add one bot - it should pick up VIP first
	ctrl.AddBot()

	// Small delay to let the bot pick up the order
	time.Sleep(20 * time.Millisecond)

	// VIP order should now be processing
	if vipOrder.Status != model.OrderStatusProcessing {
		t.Errorf("Expected VIP order to be processing, got %s", vipOrder.Status)
	}
}

func TestBotProcessingCompletes(t *testing.T) {
	ctrl := newTestController()

	ctrl.AddNormalOrder()
	ctrl.AddBot()

	// Wait for processing to complete (100ms + buffer)
	time.Sleep(150 * time.Millisecond)

	completed := ctrl.GetCompletedOrders()
	if len(completed) != 1 {
		t.Errorf("Expected 1 completed order, got %d", len(completed))
	}
}

func TestRemoveBotWhileProcessing(t *testing.T) {
	ctrl := newTestController()

	order := ctrl.AddNormalOrder()
	ctrl.AddBot()

	// Small delay to let the bot pick up the order
	time.Sleep(20 * time.Millisecond)

	// Order should be processing
	if order.Status != model.OrderStatusProcessing {
		t.Errorf("Expected order to be processing, got %s", order.Status)
	}

	// Remove the bot while processing
	ctrl.RemoveBot()

	// Order should be back to pending
	time.Sleep(20 * time.Millisecond)
	if order.Status != model.OrderStatusPending {
		t.Errorf("Expected order to be back to pending after bot removal, got %s", order.Status)
	}

	// Pending queue should have the order
	pending := ctrl.GetPendingOrders()
	if len(pending) != 1 {
		t.Errorf("Expected 1 pending order, got %d", len(pending))
	}
}

func TestMultipleBotsProcessConcurrently(t *testing.T) {
	ctrl := newTestController()

	// Add 3 orders
	ctrl.AddNormalOrder()
	ctrl.AddVIPOrder()
	ctrl.AddNormalOrder()

	// Add 2 bots
	ctrl.AddBot()
	ctrl.AddBot()

	// Wait for processing
	time.Sleep(20 * time.Millisecond)

	// After 2 bots pick up orders, 1 should remain pending
	pending := ctrl.GetPendingOrders()
	if len(pending) != 1 {
		t.Errorf("Expected 1 pending order, got %d", len(pending))
	}

	// Wait for completion
	time.Sleep(150 * time.Millisecond)

	// After first batch completes, the remaining order should be processed
	time.Sleep(150 * time.Millisecond)

	completed := ctrl.GetCompletedOrders()
	if len(completed) != 3 {
		t.Errorf("Expected 3 completed orders, got %d", len(completed))
	}
}

func TestBotBecomesIdleWhenNoOrders(t *testing.T) {
	ctrl := newTestController()

	// Add a bot first (no orders)
	bot := ctrl.AddBot()

	// Bot should be idle
	if !bot.IsIdle() {
		t.Error("Expected bot to be idle when no orders")
	}
}
