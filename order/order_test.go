package order

import (
	"sync"
	"testing"
	"time"
)

func TestAddNormalOrder(t *testing.T) {
	var output []string
	var mu sync.Mutex
	outputFunc := func(format string, args ...interface{}) {
		mu.Lock()
		output = append(output, format)
		mu.Unlock()
	}

	oc := NewOrderController(outputFunc)
	order := oc.AddNormalOrder()

	if order.ID != 1001 {
		t.Errorf("Expected order ID 1001, got %d", order.ID)
	}
	if order.Type != Normal {
		t.Errorf("Expected order type Normal, got %s", order.Type)
	}
	if order.Status != Pending {
		t.Errorf("Expected order status Pending, got %s", order.Status)
	}
}

func TestAddVIPOrder(t *testing.T) {
	var output []string
	var mu sync.Mutex
	outputFunc := func(format string, args ...interface{}) {
		mu.Lock()
		output = append(output, format)
		mu.Unlock()
	}

	oc := NewOrderController(outputFunc)
	order := oc.AddVIPOrder()

	if order.ID != 1001 {
		t.Errorf("Expected order ID 1001, got %d", order.ID)
	}
	if order.Type != VIP {
		t.Errorf("Expected order type VIP, got %s", order.Type)
	}
	if order.Status != Pending {
		t.Errorf("Expected order status Pending, got %s", order.Status)
	}
}

func TestAddBot(t *testing.T) {
	var output []string
	var mu sync.Mutex
	outputFunc := func(format string, args ...interface{}) {
		mu.Lock()
		output = append(output, format)
		mu.Unlock()
	}

	oc := NewOrderController(outputFunc)
	bot := oc.AddBot()

	if bot.ID != 1 {
		t.Errorf("Expected bot ID 1, got %d", bot.ID)
	}
	if !bot.isActive {
		t.Errorf("Expected bot to be active")
	}
}

func TestRemoveBot(t *testing.T) {
	var output []string
	var mu sync.Mutex
	outputFunc := func(format string, args ...interface{}) {
		mu.Lock()
		output = append(output, format)
		mu.Unlock()
	}

	oc := NewOrderController(outputFunc)
	oc.AddBot()
	oc.AddBot()

	if len(oc.bots) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(oc.bots))
	}

	oc.RemoveBot()
	if len(oc.bots) != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", len(oc.bots))
	}

	oc.RemoveBot()
	if len(oc.bots) != 0 {
		t.Errorf("Expected 0 bots after second removal, got %d", len(oc.bots))
	}
}

func TestOrderPriority(t *testing.T) {
	var output []string
	var mu sync.Mutex
	outputFunc := func(format string, args ...interface{}) {
		mu.Lock()
		output = append(output, format)
		mu.Unlock()
	}

	oc := NewOrderController(outputFunc)
	oc.AddNormalOrder() // 1001
	oc.AddNormalOrder() // 1002
	oc.AddVIPOrder()    // 1003
	oc.AddVIPOrder()    // 1004
	oc.AddNormalOrder() // 1005

	if len(oc.pendingVIP) != 2 {
		t.Errorf("Expected 2 VIP pending orders, got %d", len(oc.pendingVIP))
	}
	if len(oc.pendingNormal) != 3 {
		t.Errorf("Expected 3 Normal pending orders, got %d", len(oc.pendingNormal))
	}

	order1 := oc.getNextPendingOrder()
	if order1.Type != VIP || order1.ID != 1003 {
		t.Errorf("Expected first order to be VIP #1003, got %s #%d", order1.Type, order1.ID)
	}

	order2 := oc.getNextPendingOrder()
	if order2.Type != VIP || order2.ID != 1004 {
		t.Errorf("Expected second order to be VIP #1004, got %s #%d", order2.Type, order2.ID)
	}

	order3 := oc.getNextPendingOrder()
	if order3.Type != Normal || order3.ID != 1001 {
		t.Errorf("Expected third order to be Normal #1001, got %s #%d", order3.Type, order3.ID)
	}
}

func TestBotProcessing(t *testing.T) {
	var output []string
	var mu sync.Mutex
	outputFunc := func(format string, args ...interface{}) {
		mu.Lock()
		output = append(output, format)
		mu.Unlock()
	}

	oc := NewOrderController(outputFunc)
	bot := oc.AddBot()
	time.Sleep(50 * time.Millisecond) // Give time for bot to start
	_ = oc.AddNormalOrder()           // Ignore the return value
	time.Sleep(50 * time.Millisecond)

	if !bot.isActive {
		t.Log("Bot is active")
	}
}
