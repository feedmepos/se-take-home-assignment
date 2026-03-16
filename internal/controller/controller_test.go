package controller

import (
	"assignment/internal/order"
	"strings"
	"testing"
	"time"
)

func TestCreateNormalOrder(t *testing.T) {
	logs := make([]string, 0)
	logger := func(s string) {
		logs = append(logs, s)
	}
	
	c := NewController(logger)
	o := c.CreateNormalOrder()
	
	if o.ID != 1 {
		t.Errorf("Expected order ID 1, got %d", o.ID)
	}
	
	if o.Type != order.Normal {
		t.Errorf("Expected Normal order type, got %v", o.Type)
	}
	
	if len(logs) == 0 {
		t.Error("Expected log message")
	}
}

func TestCreateVIPOrder(t *testing.T) {
	logs := make([]string, 0)
	logger := func(s string) {
		logs = append(logs, s)
	}
	
	c := NewController(logger)
	o := c.CreateVIPOrder()
	
	if o.ID != 1 {
		t.Errorf("Expected order ID 1, got %d", o.ID)
	}
	
	if o.Type != order.VIP {
		t.Errorf("Expected VIP order type, got %v", o.Type)
	}
}

func TestVIPPriority(t *testing.T) {
	c := NewController(func(string) {})
	
	// Create normal orders
	c.CreateNormalOrder()
	c.CreateNormalOrder()
	
	// Create VIP order - should be at front
	vipOrder := c.CreateVIPOrder()
	
	// Create another normal order
	c.CreateNormalOrder()
	
	// Create another VIP order - should be after first VIP but before normal
	vipOrder2 := c.CreateVIPOrder()
	
	pending := c.GetPendingOrders()
	
	// First VIP should be first
	if pending[0].ID != vipOrder.ID {
		t.Errorf("Expected first VIP order to be first, got order #%d", pending[0].ID)
	}
	
	// Second VIP should be second
	if pending[1].ID != vipOrder2.ID {
		t.Errorf("Expected second VIP order to be second, got order #%d", pending[1].ID)
	}
	
	// Normal orders should be after VIP orders
	for i := 2; i < len(pending); i++ {
		if pending[i].IsVIP() {
			t.Errorf("Expected normal orders after VIP orders, but found VIP at position %d", i)
		}
	}
}

func TestAddBot(t *testing.T) {
	logs := make([]string, 0)
	logger := func(s string) {
		logs = append(logs, s)
	}
	
	c := NewController(logger)
	b := c.AddBot()
	
	if b.ID != 1 {
		t.Errorf("Expected bot ID 1, got %d", b.ID)
	}
	
	// Check log
	hasLog := false
	for _, log := range logs {
		if strings.Contains(log, "Bot #1 added") {
			hasLog = true
			break
		}
	}
	if !hasLog {
		t.Error("Expected log message for bot addition")
	}
}

func TestRemoveBot(t *testing.T) {
	c := NewController(func(string) {})
	
	// Add a bot
	c.AddBot()
	
	// Remove it
	removed := c.RemoveBot()
	if !removed {
		t.Error("Expected bot to be removed")
	}
	
	// Try to remove again (should fail)
	removed = c.RemoveBot()
	if removed {
		t.Error("Expected removal to fail when no bots exist")
	}
}

func TestRemoveBotWhileProcessing(t *testing.T) {
	logs := make([]string, 0)
	logger := func(s string) {
		logs = append(logs, s)
	}
	
	c := NewController(logger)
	
	// Create an order
	o := c.CreateNormalOrder()
	
	// Add a bot (will start processing)
	c.AddBot()
	
	// Wait a bit for processing to start
	time.Sleep(500 * time.Millisecond)
	
	// Remove the bot
	c.RemoveBot()
	
	// Wait a bit
	time.Sleep(100 * time.Millisecond)
	
	// Order should be back to PENDING
	pending := c.GetPendingOrders()
	found := false
	for _, p := range pending {
		if p.ID == o.ID && p.Status == order.PENDING {
			found = true
			break
		}
	}
	
	if !found {
		t.Error("Expected order to be back in pending queue")
	}
}

func TestOrderProcessing(t *testing.T) {
	logs := make([]string, 0)
	logger := func(s string) {
		logs = append(logs, s)
	}
	
	c := NewController(logger)
	
	// Create an order
	o := c.CreateNormalOrder()
	
	// Add a bot
	c.AddBot()
	
	// Wait for processing to complete (10 seconds + buffer for goroutine scheduling)
	time.Sleep(12 * time.Second)
	
	// Check if order is complete - check both complete list and order status
	complete := c.GetCompleteOrders()
	found := false
	for _, co := range complete {
		if co.ID == o.ID {
			found = true
			break
		}
	}
	
	// Also check the order status directly
	if !found {
		// Get all orders and check status
		allOrders, _ := c.GetState()
		for _, ord := range allOrders {
			if ord.ID == o.ID {
				if ord.Status == order.COMPLETE {
					found = true
					break
				}
			}
		}
	}
	
	if !found {
		t.Error("Expected order to be completed")
	}
}
