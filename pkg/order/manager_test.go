package order

import (
	"testing"
	"time"
)

func TestOrderManager_CreateOrder(t *testing.T) {
	om := NewManager()
	
	// Test creating normal order
	order1 := om.CreateOrder(NormalOrder)
	if order1.Type != NormalOrder {
		t.Errorf("Expected NormalOrder, got %v", order1.Type)
	}
	if order1.Status != Pending {
		t.Errorf("Expected Pending status, got %v", order1.Status)
	}
	if order1.ID != 1001 {
		t.Errorf("Expected ID 1001, got %d", order1.ID)
	}
	
	// Test creating VIP order
	order2 := om.CreateOrder(VIPOrder)
	if order2.Type != VIPOrder {
		t.Errorf("Expected VIPOrder, got %v", order2.Type)
	}
	if order2.ID != 1002 {
		t.Errorf("Expected ID 1002, got %d", order2.ID)
	}
}

func TestOrderManager_AddBot(t *testing.T) {
	om := NewManager()
	
	bot := om.AddBot()
	if bot.ID != 1 {
		t.Errorf("Expected bot ID 1, got %d", bot.ID)
	}
	if bot.Status != Idle {
		t.Errorf("Expected Idle status, got %v", bot.Status)
	}
	
	// Test multiple bots
	bot2 := om.AddBot()
	if bot2.ID != 2 {
		t.Errorf("Expected bot ID 2, got %d", bot2.ID)
	}
}

func TestOrderManager_RemoveBot(t *testing.T) {
	om := NewManager()
	
	// Add some bots
	bot1 := om.AddBot()
	bot2 := om.AddBot()
	
	// Remove bot (should remove the newest one)
	removedBot := om.RemoveBot()
	if removedBot.ID != bot2.ID {
		t.Errorf("Expected to remove bot ID %d, but removed %d", bot2.ID, removedBot.ID)
	}
	
	// Check that bot1 still exists
	bots := om.GetBots()
	if len(bots) != 1 || bots[0].ID != bot1.ID {
		t.Errorf("Expected 1 bot with ID %d, got %v", bot1.ID, bots)
	}
}

func TestOrderManager_OrderPriority(t *testing.T) {
	om := NewManager()
	
	// Create orders in mixed order
	normal1 := om.CreateOrder(NormalOrder)
	normal2 := om.CreateOrder(NormalOrder)
	vip1 := om.CreateOrder(VIPOrder)
	normal3 := om.CreateOrder(NormalOrder)
	vip2 := om.CreateOrder(VIPOrder)
	
	// Get pending orders (should be in priority order)
	pendingOrders := om.GetPendingOrders()
	
	// VIP orders should come first, then normal orders
	// Within same type, earlier orders should come first
	expectedOrder := []int{vip1.ID, vip2.ID, normal1.ID, normal2.ID, normal3.ID}
	
	if len(pendingOrders) != len(expectedOrder) {
		t.Errorf("Expected %d pending orders, got %d", len(expectedOrder), len(pendingOrders))
	}
	
	for i, expectedID := range expectedOrder {
		if pendingOrders[i].ID != expectedID {
			t.Errorf("Expected order ID %d at position %d, got %d", expectedID, i, pendingOrders[i].ID)
		}
	}
}

func TestOrderManager_OrderProcessing(t *testing.T) {
	om := NewManager()
	
	// Create an order
	order := om.CreateOrder(NormalOrder)
	
	// Add a bot
	om.AddBot()
	
	// Wait a bit for processing to start
	time.Sleep(100 * time.Millisecond)
	
	// Check that bot is processing the order
	bots := om.GetBots()
	if len(bots) != 1 {
		t.Fatalf("Expected 1 bot, got %d", len(bots))
	}
	
	// The bot should be active and processing the order
	if bots[0].Status != Active {
		t.Errorf("Expected bot to be Active, got %v", bots[0].Status)
	}
	
	if bots[0].Order == nil || bots[0].Order.ID != order.ID {
		t.Errorf("Expected bot to be processing order %d, got %v", order.ID, bots[0].Order)
	}
	
	// Wait for order completion (10 seconds)
	time.Sleep(10 * time.Second + 100 * time.Millisecond)
	
	// Check that order is completed
	orders := om.GetOrders()
	var completedOrder *Order
	for _, o := range orders {
		if o.ID == order.ID {
			completedOrder = o
			break
		}
	}
	
	if completedOrder == nil {
		t.Fatal("Order not found")
	}
	
	if completedOrder.Status != Complete {
		t.Errorf("Expected order to be Complete, got %v", completedOrder.Status)
	}
	
	if completedOrder.Completed == nil {
		t.Error("Expected order to have completion time")
	}
}

func TestOrderManager_RemoveBotWhileProcessing(t *testing.T) {
	om := NewManager()
	
	// Create an order
	order := om.CreateOrder(NormalOrder)
	
	// Add a bot
	bot := om.AddBot()
	
	// Wait for processing to start
	time.Sleep(100 * time.Millisecond)
	
	// Remove the bot while it's processing
	removedBot := om.RemoveBot()
	if removedBot.ID != bot.ID {
		t.Errorf("Expected to remove bot %d, got %d", bot.ID, removedBot.ID)
	}
	
	// Check that order is back to pending
	orders := om.GetOrders()
	var pendingOrder *Order
	for _, o := range orders {
		if o.ID == order.ID {
			pendingOrder = o
			break
		}
	}
	
	if pendingOrder == nil {
		t.Fatal("Order not found")
	}
	
	if pendingOrder.Status != Pending {
		t.Errorf("Expected order to be Pending, got %v", pendingOrder.Status)
	}
	
	if pendingOrder.Started != nil {
		t.Error("Expected order to not have start time")
	}
}

func TestOrderManager_GetPendingOrderCount(t *testing.T) {
	om := NewManager()
	
	// Initially no orders
	if count := om.GetPendingOrderCount(); count != 0 {
		t.Errorf("Expected 0 pending orders, got %d", count)
	}
	
	// Add some orders
	om.CreateOrder(NormalOrder)
	om.CreateOrder(VIPOrder)
	om.CreateOrder(NormalOrder)
	
	if count := om.GetPendingOrderCount(); count != 3 {
		t.Errorf("Expected 3 pending orders, got %d", count)
	}
}

func TestOrderManager_GetActiveBotCount(t *testing.T) {
	om := NewManager()
	
	// Initially no bots
	if count := om.GetActiveBotCount(); count != 0 {
		t.Errorf("Expected 0 active bots, got %d", count)
	}
	
	// Add some bots
	om.AddBot()
	om.AddBot()
	
	if count := om.GetActiveBotCount(); count != 2 {
		t.Errorf("Expected 2 active bots, got %d", count)
	}
}
