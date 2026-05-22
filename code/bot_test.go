package code

import (
	"testing"
	"time"
)

func TestAddBot(t *testing.T) {
	c := NewTestController()

	initialBotCount := c.GetBotCount()
	c.AddBot()

	time.Sleep(100 * time.Millisecond)

	if c.GetBotCount() != initialBotCount+1 {
		t.Errorf("Expected %d bots, got %d", initialBotCount+1, c.GetBotCount())
	}

	c.StopAllBots()
}

func TestRemoveBot(t *testing.T) {
	c := NewTestController()

	c.AddBot()
	c.AddBot()
	time.Sleep(100 * time.Millisecond)

	initialBotCount := c.GetBotCount()
	c.RemoveBot()

	time.Sleep(100 * time.Millisecond)

	if c.GetBotCount() != initialBotCount-1 {
		t.Errorf("Expected %d bots, got %d", initialBotCount-1, c.GetBotCount())
	}

	c.StopAllBots()
}

func TestRemoveBotWhenEmpty(t *testing.T) {
	c := NewTestController()

	initialBotCount := c.GetBotCount()
	c.RemoveBot()

	if c.GetBotCount() != initialBotCount {
		t.Errorf("Bot count should remain %d, got %d", initialBotCount, c.GetBotCount())
	}
}

func TestBotProcessesOrder(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping long test in short mode")
	}

	c := NewTestController()

	c.AddBot()
	order, err := c.NewOrder("NORMAL")
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	time.Sleep(500 * time.Millisecond)

	bot := c.GetBot(0)
	hasOrder := bot != nil && bot.GetCurrentOrder() != nil

	if !hasOrder {
		t.Error("Bot should have an order")
	}

	time.Sleep(11 * time.Second)

	if c.GetCompletedCount() != 1 {
		t.Errorf("Expected 1 completed order, got %d", c.GetCompletedCount())
	}
	completedOrders := c.GetCompletedOrders()
	if completedOrders[0].ID != order.ID {
		t.Errorf("Expected order ID %d, got %d", order.ID, completedOrders[0].ID)
	}

	c.StopAllBots()
}

func TestBotReturnsOrderWhenRemoved(t *testing.T) {
	c := NewTestController()

	c.AddBot()
	order, err := c.NewOrder("NORMAL")
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	time.Sleep(500 * time.Millisecond)

	bot := c.GetBot(0)
	hasOrder := bot != nil && bot.GetCurrentOrder() != nil

	if !hasOrder {
		t.Fatal("Bot does not have order")
	}

	c.RemoveBot()
	time.Sleep(500 * time.Millisecond)

	_, normalCount := c.GetPendingCount()
	if normalCount == 0 {
		t.Error("Order was not returned to queue")
	}

	nextOrder := c.GetNextOrder()
	if nextOrder == nil || nextOrder.ID != order.ID {
		t.Errorf("Expected order %d at front", order.ID)
	}
}

func TestBotDoesNotTakeOrderWhenBusy(t *testing.T) {
	c := NewTestController()

	c.AddBot()
	c.NewOrder("NORMAL")

	time.Sleep(500 * time.Millisecond)

	bot := c.GetBot(0)
	if bot == nil {
		t.Fatal("Bot not found")
	}
	isBusy := bot.IsBusy()

	if !isBusy {
		t.Fatal("Bot is not busy")
	}

	c.NewOrder("NORMAL")
	time.Sleep(500 * time.Millisecond)

	_, normalCount := c.GetPendingCount()
	if normalCount != 1 {
		t.Errorf("Expected 1 order in queue, got %d", normalCount)
	}

	c.StopAllBots()
}

func TestVIPOrderPriority(t *testing.T) {
	c := NewTestController()

	c.NewOrder("NORMAL")
	c.NewOrder("VIP")
	c.AddBot()

	time.Sleep(500 * time.Millisecond)

	bot := c.GetBot(0)
	if bot == nil {
		t.Fatal("Bot not found")
	}
	currentOrder := bot.GetCurrentOrder()
	if currentOrder != nil && currentOrder.Type != "VIP" {
		t.Errorf("Bot should pick VIP first, got %s", currentOrder.Type)
	}

	c.StopAllBots()
}

// TestRemoveBotWhileProcessing tests the race condition where a bot is removed
// while actively processing an order. This reproduces the scenario:
// normal -> addbot -> removebot (while processing)
func TestRemoveBotWhileProcessing(t *testing.T) {
	c := NewTestController()

	// Create an order first
	order, err := c.NewOrder("NORMAL")
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Add bot - it will pick up the order
	c.AddBot()

	// Wait for bot to start processing
	time.Sleep(500 * time.Millisecond)

	// Verify bot is processing
	if c.GetBotCount() != 1 {
		t.Fatal("Expected 1 bot")
	}
	bot := c.GetBot(0)
	if bot == nil || !bot.IsBusy() {
		t.Fatal("Bot should be busy processing")
	}

	// Remove bot while it's processing (this triggers the race condition)
	c.RemoveBot()

	// Wait for removal to complete
	time.Sleep(500 * time.Millisecond)

	// Verify order was returned to queue
	_, normalCount := c.GetPendingCount()
	if normalCount != 1 {
		t.Errorf("Order should be back in queue, got %d pending", normalCount)
	}

	// Verify the order can be retrieved again
	returnedOrder := c.GetNextOrder()
	if returnedOrder == nil {
		t.Fatal("Order should be available in queue")
	}
	if returnedOrder.ID != order.ID {
		t.Errorf("Expected order ID %d, got %d", order.ID, returnedOrder.ID)
	}
}

func TestOrderNotProcessedTwice(t *testing.T) {
	c := NewTestController()

	// Add 3 bots to create race condition potential
	c.AddBot()
	c.AddBot()
	c.AddBot()

	// Create 1 order
	order, err := c.NewOrder("NORMAL")
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Wait for bots to pick up orders
	time.Sleep(500 * time.Millisecond)

	// Count how many bots are processing this specific order
	processingCount := 0
	for _, bot := range c.GetAllBots() {
		current := bot.GetCurrentOrder()
		if current != nil && current.ID == order.ID {
			processingCount++
		}
	}

	if processingCount > 1 {
		t.Errorf("Order #%d is being processed by %d bots, expected 1", order.ID, processingCount)
	}

	// Wait for completion
	time.Sleep(11 * time.Second)

	// Verify order is completed exactly once
	if c.GetCompletedCount() != 1 {
		t.Errorf("Expected 1 completed order, got %d", c.GetCompletedCount())
	}

	completedOrders := c.GetCompletedOrders()
	if len(completedOrders) != 1 || completedOrders[0].ID != order.ID {
		t.Error("Wrong order in completed list")
	}

	c.StopAllBots()
}
