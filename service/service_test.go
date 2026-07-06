package service

import (
	"os"
	"sync"
	"testing"
	"time"
)

func TestNewOrderController(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	if oc.nextOrderID != 1 {
		t.Errorf("Expected nextOrderID to be 1, got %d", oc.nextOrderID)
	}
	if oc.nextBotID != 1 {
		t.Errorf("Expected nextBotID to be 1, got %d", oc.nextBotID)
	}
}

func TestAddNormalOrder(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddNormalOrder()

	oc.mu.RLock()
	orderCount := len(oc.orders)
	orderType := oc.orders[0].Type
	orderID := oc.orders[0].ID
	oc.mu.RUnlock()

	if orderCount != 1 {
		t.Errorf("Expected 1 order, got %d", orderCount)
	}
	if orderType != NormalOrder {
		t.Errorf("Expected NormalOrder type, got %v", orderType)
	}
	if orderID != 1 {
		t.Errorf("Expected order ID 1, got %d", orderID)
	}
}

func TestAddVIPOrder(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddNormalOrder()
	oc.AddVIPOrder()

	oc.mu.RLock()
	orderCount := len(oc.orders)
	firstType := oc.orders[0].Type
	secondType := oc.orders[1].Type
	oc.mu.RUnlock()

	if orderCount != 2 {
		t.Errorf("Expected 2 orders, got %d", orderCount)
	}
	if firstType != VIPOrder {
		t.Errorf("Expected first order to be VIP, got %v", firstType)
	}
	if secondType != NormalOrder {
		t.Errorf("Expected second order to be Normal, got %v", secondType)
	}
}

func TestVIPOrderPriority(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddNormalOrder()
	oc.AddNormalOrder()
	oc.AddVIPOrder()
	oc.AddVIPOrder()

	oc.mu.RLock()
	expectedOrder := []OrderType{VIPOrder, VIPOrder, NormalOrder, NormalOrder}
	for i, expected := range expectedOrder {
		if oc.orders[i].Type != expected {
			t.Errorf("Order at position %d: expected %v, got %v", i, expected, oc.orders[i].Type)
		}
	}
	oc.mu.RUnlock()
}

func TestVIPOrderInsertionAfterExistingVIP(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddVIPOrder()
	oc.AddNormalOrder()
	oc.AddVIPOrder()

	oc.mu.RLock()
	if len(oc.orders) != 3 {
		t.Errorf("Expected 3 orders, got %d", len(oc.orders))
	}
	if oc.orders[0].Type != VIPOrder || oc.orders[0].ID != 1 {
		t.Errorf("First order should be VIP #1, got %v #%d", oc.orders[0].Type, oc.orders[0].ID)
	}
	if oc.orders[1].Type != VIPOrder || oc.orders[1].ID != 3 {
		t.Errorf("Second order should be VIP #3, got %v #%d", oc.orders[1].Type, oc.orders[1].ID)
	}
	if oc.orders[2].Type != NormalOrder || oc.orders[2].ID != 2 {
		t.Errorf("Third order should be Normal #2, got %v #%d", oc.orders[2].Type, oc.orders[2].ID)
	}
	oc.mu.RUnlock()
}

func TestAddBot(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddBot()

	oc.mu.RLock()
	botCount := len(oc.bots)
	botID := oc.bots[0].ID
	oc.mu.RUnlock()

	if botCount != 1 {
		t.Errorf("Expected 1 bot, got %d", botCount)
	}
	if botID != 1 {
		t.Errorf("Expected bot ID 1, got %d", botID)
	}
}

func TestRemoveBot(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddBot()
	oc.AddBot()
	oc.RemoveBot()

	oc.mu.RLock()
	botCount := len(oc.bots)
	oc.mu.RUnlock()

	if botCount != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", botCount)
	}
}

func TestRemoveBotWithProcessingOrder(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddNormalOrder()
	oc.AddBot()

	time.Sleep(500 * time.Millisecond)

	oc.RemoveBot()

	var ordersInQueue int
	oc.mu.RLock()
	ordersInQueue = len(oc.orders)
	oc.mu.RUnlock()

	if ordersInQueue != 1 {
		t.Errorf("Expected order to be returned to queue, got %d orders", ordersInQueue)
	}

	time.Sleep(100 * time.Millisecond)
}

func TestOrderProcessing(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddNormalOrder()
	oc.AddBot()

	time.Sleep(11 * time.Second)

	var ordersRemaining int
	oc.mu.RLock()
	ordersRemaining = len(oc.orders)
	oc.mu.RUnlock()

	if ordersRemaining != 0 {
		t.Errorf("Expected order to be processed, but %d orders remain", ordersRemaining)
	}
}

func TestMultipleBotsProcessing(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddNormalOrder()
	oc.AddNormalOrder()
	oc.AddBot()
	oc.AddBot()

	time.Sleep(11 * time.Second)

	oc.mu.RLock()
	remaining := len(oc.orders)
	oc.mu.RUnlock()

	if remaining != 0 {
		t.Errorf("Expected all orders to be processed, but %d orders remain", remaining)
	}
}

func TestUniqueOrderNumbers(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddNormalOrder()
	oc.AddVIPOrder()
	oc.AddNormalOrder()

	oc.mu.RLock()
	ids := make(map[int]bool)
	for _, order := range oc.orders {
		if ids[order.ID] {
			t.Errorf("Duplicate order ID found: %d", order.ID)
		}
		ids[order.ID] = true
	}
	oc.mu.RUnlock()
}

func TestGetStatus(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	status := oc.GetStatus()
	expected := "status: bot: [0/0], order: []"
	if status != expected {
		t.Errorf("Expected status '%s', got '%s'", expected, status)
	}
}

func TestBotReturnsToIdleAfterCompletion(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	oc.AddNormalOrder()
	oc.AddBot()

	time.Sleep(11 * time.Second)

	var idleBots int
	oc.mu.RLock()
	for _, bot := range oc.bots {
		bot.mu.Lock()
		if !bot.IsProcessing {
			idleBots++
		}
		bot.mu.Unlock()
	}
	oc.mu.RUnlock()

	if idleBots != 1 {
		t.Errorf("Expected 1 idle bot after order completion, got %d", idleBots)
	}
}

func TestConcurrentOrderCreation(t *testing.T) {
	oc, err := NewOrderController("/tmp/test_result.txt")
	if err != nil {
		t.Fatalf("Failed to create OrderController: %v", err)
	}
	defer oc.Close()
	defer os.Remove("/tmp/test_result.txt")

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			oc.AddNormalOrder()
		}()
	}
	wg.Wait()

	oc.mu.RLock()
	orderCount := len(oc.orders)
	oc.mu.RUnlock()

	if orderCount != 10 {
		t.Errorf("Expected 10 orders, got %d", orderCount)
	}
}
