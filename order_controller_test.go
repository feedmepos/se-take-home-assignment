package main

import (
	"testing"
	"time"
)

func TestNewOrderController(t *testing.T) {
	oc := NewOrderController()
	if oc == nil {
		t.Fatal("Expected non-nil OrderController")
	}
	if oc.GetBotCount() != 0 {
		t.Errorf("Expected 0 bots, got %d", oc.GetBotCount())
	}
	if oc.GetPendingCount() != 0 {
		t.Errorf("Expected 0 pending orders, got %d", oc.GetPendingCount())
	}
}

func TestAddNormalOrder(t *testing.T) {
	oc := NewOrderController()
	order := oc.AddNormalOrder()

	if order.ID != 1 {
		t.Errorf("Expected order ID 1, got %d", order.ID)
	}
	if order.Type != NormalOrder {
		t.Errorf("Expected NormalOrder, got %v", order.Type)
	}
	if order.Status != Pending {
		t.Errorf("Expected Pending status, got %v", order.Status)
	}
	if oc.GetPendingCount() != 1 {
		t.Errorf("Expected 1 pending order, got %d", oc.GetPendingCount())
	}
}

func TestAddVIPOrder(t *testing.T) {
	oc := NewOrderController()
	order := oc.AddVIPOrder()

	if order.ID != 1 {
		t.Errorf("Expected order ID 1, got %d", order.ID)
	}
	if order.Type != VIPOrder {
		t.Errorf("Expected VIPOrder, got %v", order.Type)
	}
}

func TestOrderIDIncrement(t *testing.T) {
	oc := NewOrderController()

	order1 := oc.AddNormalOrder()
	order2 := oc.AddNormalOrder()
	order3 := oc.AddVIPOrder()

	if order1.ID != 1 || order2.ID != 2 || order3.ID != 3 {
		t.Errorf("Expected order IDs 1, 2, 3, got %d, %d, %d", order1.ID, order2.ID, order3.ID)
	}
}

func TestVIPPriority(t *testing.T) {
	oc := NewOrderController()

	normal1 := oc.AddNormalOrder()
	normal2 := oc.AddNormalOrder()
	vip := oc.AddVIPOrder()

	_ = normal1
	_ = normal2

	if oc.pendingQ[0] != vip {
		t.Error("Expected VIP order to be at front of queue")
	}
}

func TestMultipleVIPPriority(t *testing.T) {
	oc := NewOrderController()

	normal1 := oc.AddNormalOrder()
	vip1 := oc.AddVIPOrder()
	normal2 := oc.AddNormalOrder()
	vip2 := oc.AddVIPOrder()

	_ = normal1
	_ = normal2

	if oc.pendingQ[0] != vip1 {
		t.Error("Expected first VIP order to be at position 0")
	}
	if oc.pendingQ[1] != vip2 {
		t.Error("Expected second VIP order to be at position 1")
	}
}

func TestAddBot(t *testing.T) {
	oc := NewOrderController()
	bot := oc.AddBot()

	if bot.ID != 1 {
		t.Errorf("Expected bot ID 1, got %d", bot.ID)
	}
	if oc.GetBotCount() != 1 {
		t.Errorf("Expected 1 bot, got %d", oc.GetBotCount())
	}
}

func TestBotProcessesOrder(t *testing.T) {
	oc := NewOrderController()

	oc.AddNormalOrder()
	oc.AddBot()

	time.Sleep(11 * time.Second)

	if oc.GetPendingCount() != 0 {
		t.Errorf("Expected 0 pending orders after completion, got %d", oc.GetPendingCount())
	}
	if oc.GetCompletedCount() != 1 {
		t.Errorf("Expected 1 completed order, got %d", oc.GetCompletedCount())
	}
}

func TestRemoveIdleBot(t *testing.T) {
	oc := NewOrderController()

	oc.AddBot()
	oc.AddBot()

	if oc.GetBotCount() != 2 {
		t.Fatalf("Expected 2 bots, got %d", oc.GetBotCount())
	}

	oc.RemoveBot()

	if oc.GetBotCount() != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", oc.GetBotCount())
	}
}

func TestRemoveProcessingBot(t *testing.T) {
	oc := NewOrderController()

	oc.AddNormalOrder()
	oc.AddBot()

	time.Sleep(500 * time.Millisecond)

	if oc.GetPendingCount() != 0 {
		t.Fatalf("Expected 0 pending orders, got %d", oc.GetPendingCount())
	}

	oc.RemoveBot()

	if oc.GetPendingCount() != 1 {
		t.Errorf("Expected order to return to pending, got %d pending", oc.GetPendingCount())
	}
	if oc.GetBotCount() != 0 {
		t.Errorf("Expected 0 bots, got %d", oc.GetBotCount())
	}
}

func TestBotAutoAssignment(t *testing.T) {
	oc := NewOrderController()

	oc.AddBot()
	time.Sleep(100 * time.Millisecond)

	oc.AddNormalOrder()
	time.Sleep(500 * time.Millisecond)

	if oc.GetPendingCount() != 0 {
		t.Errorf("Expected bot to auto-assign order, got %d pending", oc.GetPendingCount())
	}
}

func TestMultipleBotsProcessMultipleOrders(t *testing.T) {
	oc := NewOrderController()

	oc.AddNormalOrder()
	oc.AddNormalOrder()
	oc.AddBot()
	oc.AddBot()

	time.Sleep(11 * time.Second)

	if oc.GetPendingCount() != 0 {
		t.Errorf("Expected 0 pending orders, got %d", oc.GetPendingCount())
	}
	if oc.GetCompletedCount() != 2 {
		t.Errorf("Expected 2 completed orders, got %d", oc.GetCompletedCount())
	}
}

func TestOrderCompletionTime(t *testing.T) {
	oc := NewOrderController()

	start := time.Now()
	oc.AddNormalOrder()
	oc.AddBot()

	time.Sleep(10500 * time.Millisecond)

	elapsed := time.Since(start)

	if elapsed < 10*time.Second {
		t.Errorf("Order should take at least 10 seconds, took %v", elapsed)
	}
	if oc.GetCompletedCount() != 1 {
		t.Errorf("Expected 1 completed order, got %d", oc.GetCompletedCount())
	}
}
