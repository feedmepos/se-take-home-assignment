package controller

import (
	"testing"
	"time"
)

func TestOrderController_CreateNormalOrder(t *testing.T) {
	ctrl := NewOrderController()

	order := ctrl.CreateNormalOrder()

	if order.ID != 1 {
		t.Errorf("Expected order ID to be 1, got %d", order.ID)
	}

	if order.Type != Normal {
		t.Errorf("Expected order type to be Normal")
	}

	if order.Status != "PENDING" {
		t.Errorf("Expected order status to be PENDING, got %s", order.Status)
	}

	if ctrl.GetTotalOrdersCreated() != 1 {
		t.Errorf("Expected total orders created to be 1, got %d", ctrl.GetTotalOrdersCreated())
	}

	if ctrl.GetPendingOrderCount() != 1 {
		t.Errorf("Expected pending orders count to be 1, got %d", ctrl.GetPendingOrderCount())
	}
}

func TestOrderController_CreateVIPOrder(t *testing.T) {
	ctrl := NewOrderController()

	// Create a normal order first
	normalOrder := ctrl.CreateNormalOrder()

	// Create a VIP order - should be prioritized
	vipOrder := ctrl.CreateVIPOrder()

	if vipOrder.Type != VIP {
		t.Errorf("Expected order type to be VIP")
	}

	// VIP order should be first in queue
	ctrl.mu.RLock()
	if len(ctrl.pendingQueue) != 2 {
		t.Errorf("Expected 2 orders in pending queue, got %d", len(ctrl.pendingQueue))
	}

	if ctrl.pendingQueue[0].ID != vipOrder.ID {
		t.Errorf("Expected VIP order to be first in queue")
	}

	if ctrl.pendingQueue[1].ID != normalOrder.ID {
		t.Errorf("Expected normal order to be second in queue")
	}
	ctrl.mu.RUnlock()
}

func TestOrderController_VIPOrderPriority(t *testing.T) {
	ctrl := NewOrderController()

	// Create orders in this sequence: Normal, VIP, Normal, VIP
	normal1 := ctrl.CreateNormalOrder()
	vip1 := ctrl.CreateVIPOrder()
	normal2 := ctrl.CreateNormalOrder()
	vip2 := ctrl.CreateVIPOrder()

	// Expected order in queue: VIP1, VIP2, Normal1, Normal2
	ctrl.mu.RLock()
	expectedOrder := []int{vip1.ID, vip2.ID, normal1.ID, normal2.ID}

	for i, expectedID := range expectedOrder {
		if ctrl.pendingQueue[i].ID != expectedID {
			t.Errorf("Queue position %d: expected order ID %d, got %d", i, expectedID, ctrl.pendingQueue[i].ID)
		}
	}
	ctrl.mu.RUnlock()
}

func TestOrderController_AddBot(t *testing.T) {
	ctrl := NewOrderController()

	bot := ctrl.AddBot()

	if bot.ID != 1 {
		t.Errorf("Expected bot ID to be 1, got %d", bot.ID)
	}

	if bot.Status != Idle {
		t.Errorf("Expected bot status to be Idle")
	}

	if ctrl.GetActiveBotCount() != 1 {
		t.Errorf("Expected active bot count to be 1, got %d", ctrl.GetActiveBotCount())
	}
}

func TestOrderController_BotProcessesOrder(t *testing.T) {
	ctrl := NewOrderController()

	// Create an order
	order := ctrl.CreateNormalOrder()

	// Add a bot - should immediately start processing
	bot := ctrl.AddBot()

	// Give it a moment to start processing
	time.Sleep(100 * time.Millisecond)

	ctrl.mu.RLock()
	if bot.Status != Processing {
		t.Errorf("Expected bot to be processing")
	}

	if bot.CurrentOrder == nil || bot.CurrentOrder.ID != order.ID {
		t.Errorf("Expected bot to be processing the created order")
	}

	if order.Status != "PROCESSING" {
		t.Errorf("Expected order status to be PROCESSING, got %s", order.Status)
	}

	if len(ctrl.pendingQueue) != 0 {
		t.Errorf("Expected pending queue to be empty, got %d orders", len(ctrl.pendingQueue))
	}
	ctrl.mu.RUnlock()
}

func TestOrderController_RemoveBot(t *testing.T) {
	ctrl := NewOrderController()

	// Create two bots
	bot1 := ctrl.AddBot()
	bot2 := ctrl.AddBot()

	// Remove bot (should remove the newest one - bot2)
	removedBot := ctrl.RemoveBot()

	if removedBot.ID != bot2.ID {
		t.Errorf("Expected to remove bot2 (ID: %d), got bot ID: %d", bot2.ID, removedBot.ID)
	}

	if ctrl.GetActiveBotCount() != 1 {
		t.Errorf("Expected 1 active bot after removal, got %d", ctrl.GetActiveBotCount())
	}

	// Remaining bot should be bot1
	ctrl.mu.RLock()
	if ctrl.bots[0].ID != bot1.ID {
		t.Errorf("Expected remaining bot to be bot1")
	}
	ctrl.mu.RUnlock()
}

func TestOrderController_RemoveBotWhileProcessing(t *testing.T) {
	ctrl := NewOrderController()

	// Create an order and a bot
	order := ctrl.CreateNormalOrder()
	bot := ctrl.AddBot()

	// Wait for processing to start
	time.Sleep(100 * time.Millisecond)

	// Verify bot is processing
	ctrl.mu.RLock()
	if bot.Status != Processing {
		t.Errorf("Expected bot to be processing")
	}
	ctrl.mu.RUnlock()

	// Remove the bot while it's processing
	removedBot := ctrl.RemoveBot()

	if removedBot.ID != bot.ID {
		t.Errorf("Expected to remove the processing bot")
	}

	// Order should be back in pending queue
	if ctrl.GetPendingOrderCount() != 1 {
		t.Errorf("Expected order to be back in pending queue")
	}

	ctrl.mu.RLock()
	if ctrl.pendingQueue[0].ID != order.ID {
		t.Errorf("Expected the interrupted order to be back in pending queue")
	}

	if ctrl.pendingQueue[0].Status != "PENDING" {
		t.Errorf("Expected order status to be PENDING after bot removal")
	}
	ctrl.mu.RUnlock()
}

func TestOrderController_OrderCompletion(t *testing.T) {
	ctrl := NewOrderController()

	// Create order and bot
	order := ctrl.CreateNormalOrder()
	ctrl.AddBot()

	// Wait for processing to complete (slightly more than 10 seconds)
	time.Sleep(11 * time.Second)

	// Order should be completed
	if ctrl.GetCompletedOrderCount() != 1 {
		t.Errorf("Expected 1 completed order, got %d", ctrl.GetCompletedOrderCount())
	}

	ctrl.mu.RLock()
	if len(ctrl.completedOrders) != 1 {
		t.Errorf("Expected 1 order in completed orders")
	}

	if ctrl.completedOrders[0].ID != order.ID {
		t.Errorf("Expected the created order to be completed")
	}

	if ctrl.completedOrders[0].Status != "COMPLETE" {
		t.Errorf("Expected completed order status to be COMPLETE")
	}
	ctrl.mu.RUnlock()
}

func TestOrderController_EmptyQueue(t *testing.T) {
	ctrl := NewOrderController()

	// Create bot without orders
	bot := ctrl.AddBot()

	// Bot should remain idle
	time.Sleep(100 * time.Millisecond)

	if bot.Status != Idle {
		t.Errorf("Expected bot to remain idle when no orders available")
	}

	if bot.CurrentOrder != nil {
		t.Errorf("Expected bot to have no current order")
	}
}
