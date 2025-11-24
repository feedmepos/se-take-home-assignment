package main

import (
	"os"
	"testing"
	"time"
)

func TestOrderCreation(t *testing.T) {
	restaurant, _ := NewRestaurant("test_result.txt")
	defer restaurant.Close()
	defer os.Remove("test_result.txt")

	restaurant.AddNormalOrder()

	if len(restaurant.orders) != 1 {
		t.Errorf("Expected 1 order, got %d", len(restaurant.orders))
	}

	if restaurant.orders[0].Type != Normal {
		t.Errorf("Expected Normal order, got %v", restaurant.orders[0].Type)
	}

	if restaurant.orders[0].ID != 1 {
		t.Errorf("Expected order ID 1, got %d", restaurant.orders[0].ID)
	}
}

func TestVIPOrderPriority(t *testing.T) {
	restaurant, _ := NewRestaurant("test_result.txt")
	defer restaurant.Close()
	defer os.Remove("test_result.txt")

	// Add normal orders first
	restaurant.AddNormalOrder()
	restaurant.AddNormalOrder()

	// Add VIP order
	restaurant.AddVIPOrder()

	if len(restaurant.orders) != 3 {
		t.Errorf("Expected 3 orders, got %d", len(restaurant.orders))
	}

	// VIP should be at position 0
	if restaurant.orders[0].Type != VIP {
		t.Errorf("Expected VIP order at position 0, got %v", restaurant.orders[0].Type)
	}

	// Normal orders should follow
	if restaurant.orders[1].Type != Normal || restaurant.orders[2].Type != Normal {
		t.Error("Expected Normal orders after VIP order")
	}
}

func TestMultipleVIPOrders(t *testing.T) {
	restaurant, _ := NewRestaurant("test_result.txt")
	defer restaurant.Close()
	defer os.Remove("test_result.txt")

	restaurant.AddVIPOrder()    // Order 1 (VIP)
	restaurant.AddNormalOrder() // Order 2 (Normal)
	restaurant.AddVIPOrder()    // Order 3 (VIP)
	restaurant.AddNormalOrder() // Order 4 (Normal)

	if len(restaurant.orders) != 4 {
		t.Errorf("Expected 4 orders, got %d", len(restaurant.orders))
	}

	// Check order: VIP(1), VIP(3), Normal(2), Normal(4)
	if restaurant.orders[0].ID != 1 || restaurant.orders[0].Type != VIP {
		t.Error("First order should be VIP order #1")
	}
	if restaurant.orders[1].ID != 3 || restaurant.orders[1].Type != VIP {
		t.Error("Second order should be VIP order #3")
	}
	if restaurant.orders[2].ID != 2 || restaurant.orders[2].Type != Normal {
		t.Error("Third order should be Normal order #2")
	}
	if restaurant.orders[3].ID != 4 || restaurant.orders[3].Type != Normal {
		t.Error("Fourth order should be Normal order #4")
	}
}

func TestBotCreation(t *testing.T) {
	restaurant, _ := NewRestaurant("test_result.txt")
	defer restaurant.Close()
	defer os.Remove("test_result.txt")

	restaurant.AddBot()
	time.Sleep(100 * time.Millisecond)

	if len(restaurant.bots) != 1 {
		t.Errorf("Expected 1 bot, got %d", len(restaurant.bots))
	}

	if restaurant.bots[0].ID != 1 {
		t.Errorf("Expected bot ID 1, got %d", restaurant.bots[0].ID)
	}
}

func TestBotProcessing(t *testing.T) {
	restaurant, _ := NewRestaurant("test_result.txt")
	defer restaurant.Close()
	defer os.Remove("test_result.txt")

	restaurant.AddNormalOrder()
	restaurant.AddBot()

	// Wait for bot to pick up order
	time.Sleep(500 * time.Millisecond)

	restaurant.mu.Lock()
	pendingCount := len(restaurant.orders)
	restaurant.mu.Unlock()

	if pendingCount != 0 {
		t.Errorf("Expected 0 pending orders, got %d", pendingCount)
	}

	// Wait for processing to complete
	time.Sleep(10 * time.Second)

	restaurant.mu.Lock()
	completedCount := len(restaurant.completedOrders)
	restaurant.mu.Unlock()

	if completedCount != 1 {
		t.Errorf("Expected 1 completed order, got %d", completedCount)
	}
}

func TestBotRemoval(t *testing.T) {
	restaurant, _ := NewRestaurant("test_result.txt")
	defer restaurant.Close()
	defer os.Remove("test_result.txt")

	restaurant.AddBot()
	restaurant.AddBot()
	time.Sleep(100 * time.Millisecond)

	if len(restaurant.bots) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(restaurant.bots))
	}

	restaurant.RemoveBot()
	time.Sleep(100 * time.Millisecond)

	if len(restaurant.bots) != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", len(restaurant.bots))
	}
}

func TestBotRemovalDuringProcessing(t *testing.T) {
	restaurant, _ := NewRestaurant("test_result.txt")
	defer restaurant.Close()
	defer os.Remove("test_result.txt")

	restaurant.AddNormalOrder()
	restaurant.AddBot()

	// Wait for bot to pick up order
	time.Sleep(500 * time.Millisecond)

	// Remove bot while processing
	restaurant.RemoveBot()
	time.Sleep(100 * time.Millisecond)

	restaurant.mu.Lock()
	pendingCount := len(restaurant.orders)
	botCount := len(restaurant.bots)
	restaurant.mu.Unlock()

	if botCount != 0 {
		t.Errorf("Expected 0 bots, got %d", botCount)
	}

	if pendingCount != 1 {
		t.Errorf("Expected 1 pending order (returned), got %d", pendingCount)
	}
}

func TestOrderIDIncrement(t *testing.T) {
	restaurant, _ := NewRestaurant("test_result.txt")
	defer restaurant.Close()
	defer os.Remove("test_result.txt")

	restaurant.AddNormalOrder()
	restaurant.AddVIPOrder()
	restaurant.AddNormalOrder()

	//expectedIDs := []int{1, 2, 3}
	for i, order := range restaurant.orders {
		if i == 0 && order.ID != 2 { // VIP should be first but ID should be 2
			t.Errorf("First order should have ID 2, got %d", order.ID)
		}
	}

	if restaurant.nextOrderID != 4 {
		t.Errorf("Expected next order ID to be 4, got %d", restaurant.nextOrderID)
	}
}

func TestMultipleBotsConcurrent(t *testing.T) {
	restaurant, _ := NewRestaurant("test_result.txt")
	defer restaurant.Close()
	defer os.Remove("test_result.txt")

	// Add multiple orders
	restaurant.AddNormalOrder()
	restaurant.AddNormalOrder()
	restaurant.AddNormalOrder()

	// Add multiple bots
	restaurant.AddBot()
	restaurant.AddBot()

	// Wait for processing
	time.Sleep(11 * time.Second)

	restaurant.mu.Lock()
	completedCount := len(restaurant.completedOrders)
	pendingCount := len(restaurant.orders)

	// Count orders being processed by bots
	processingCount := 0
	for _, bot := range restaurant.bots {
		bot.mu.Lock()
		if bot.processing != nil {
			processingCount++
		}
		bot.mu.Unlock()
	}
	restaurant.mu.Unlock()

	if completedCount < 2 {
		t.Errorf("Expected at least 2 completed orders, got %d", completedCount)
	}

	totalOrders := pendingCount + completedCount + processingCount
	if totalOrders != 3 {
		t.Errorf("Total orders should be 3, got pending=%d, processing=%d, completed=%d", pendingCount, processingCount, completedCount)
	}
}

// func TestMultipleBotsConcurrent(t *testing.T) {
// 	restaurant, _ := NewRestaurant("test_result.txt")
// 	defer restaurant.Close()
// 	defer os.Remove("test_result.txt")

// 	Add multiple orders
// 	restaurant.AddNormalOrder()
// 	restaurant.AddNormalOrder()
// 	restaurant.AddNormalOrder()

// 	Add multiple bots
// 	restaurant.AddBot()
// 	restaurant.AddBot()

// 	Wait for processing
// 	time.Sleep(11 * time.Second)

// 	restaurant.mu.Lock()
// 	completedCount := len(restaurant.completedOrders)
// 	pendingCount := len(restaurant.orders)
// 	restaurant.mu.Unlock()

// 	if completedCount < 2 {
// 		t.Errorf("Expected at least 2 completed orders, got %d", completedCount)
// 	}

// 	if pendingCount+completedCount != 3 {
// 		t.Errorf("Total orders should be 3, got pending=%d, completed=%d", pendingCount, completedCount)
// 	}
// }
