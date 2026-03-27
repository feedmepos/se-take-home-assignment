// simulation_test.go
package main

import (
	"testing"
	"time"
)

func TestAddNormalOrder(t *testing.T) {
	sim := NewSimulation()
	sim.addOrder(NORMAL)
	
	if len(sim.orders) != 1 {
		t.Errorf("Expected 1 order, got %d", len(sim.orders))
	}
	
	order := sim.orders[1001]
	if order.Type != NORMAL {
		t.Errorf("Expected NORMAL order type, got %s", order.Type)
	}
	
	if order.Status != PENDING {
		t.Errorf("Expected PENDING status, got %s", order.Status)
	}
}

func TestAddVIPOrder(t *testing.T) {
	sim := NewSimulation()
	sim.addOrder(VIP)
	
	if len(sim.orders) != 1 {
		t.Errorf("Expected 1 order, got %d", len(sim.orders))
	}
	
	order := sim.orders[1001]
	if order.Type != VIP {
		t.Errorf("Expected VIP order type, got %s", order.Type)
	}
}

func TestOrderPriority(t *testing.T) {
	sim := NewSimulation()
	
	// Add orders in sequence: Normal, VIP, Normal
	sim.addOrder(NORMAL) // ID: 1001
	sim.addOrder(VIP)    // ID: 1002
	sim.addOrder(NORMAL) // ID: 1003
	
	// Check VIP order is first in pending
	if len(sim.pendingVIP) != 1 {
		t.Errorf("Expected 1 VIP pending order, got %d", len(sim.pendingVIP))
	}
	
	if sim.pendingVIP[0].ID != 1002 {
		t.Errorf("Expected VIP order 1002 to be first in VIP queue, got %d", sim.pendingVIP[0].ID)
	}
	
	// Check normal orders maintain order
	if len(sim.pendingNormal) != 2 {
		t.Errorf("Expected 2 normal pending orders, got %d", len(sim.pendingNormal))
	}
	
	if sim.pendingNormal[0].ID != 1001 {
		t.Errorf("Expected first normal order to be 1001, got %d", sim.pendingNormal[0].ID)
	}
	if sim.pendingNormal[1].ID != 1003 {
		t.Errorf("Expected second normal order to be 1003, got %d", sim.pendingNormal[1].ID)
	}
}

func TestAddBot(t *testing.T) {
	sim := NewSimulation()
	sim.addBot()
	
	if len(sim.bots) != 1 {
		t.Errorf("Expected 1 bot, got %d", len(sim.bots))
	}
	
	bot := sim.bots[1]
	if bot.Status != IDLE {
		t.Errorf("Expected IDLE bot status, got %s", bot.Status)
	}
}

func TestRemoveBot(t *testing.T) {
	sim := NewSimulation()
	sim.addBot() // Bot #1
	sim.addBot() // Bot #2
	
	sim.removeBot() // Remove Bot #2
	
	if len(sim.bots) != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", len(sim.bots))
	}
	
	if _, exists := sim.bots[2]; exists {
		t.Error("Bot #2 should have been removed")
	}
}

func TestOrderProcessing(t *testing.T) {
	sim := NewSimulation()
	sim.addOrder(NORMAL)
	sim.addBot()
	
	// Give some time for processing to start
	time.Sleep(100 * time.Millisecond)
	
	// Check order is being processed
	sim.mu.RLock()
	order := sim.orders[1001]
	sim.mu.RUnlock()
	
	if order.Status != PROCESSING {
		t.Errorf("Expected PROCESSING status, got %s", order.Status)
	}
	
	// Wait for processing to complete (10 seconds + buffer)
	time.Sleep(11 * time.Second)
	
	sim.mu.RLock()
	defer sim.mu.RUnlock()
	
	if order.Status != COMPLETE {
		t.Errorf("Expected COMPLETE status after processing, got %s", order.Status)
	}
}

func TestBotIdleWhenNoOrders(t *testing.T) {
	sim := NewSimulation()
	sim.addBot()
	
	if len(sim.bots) != 1 {
		t.Errorf("Expected 1 bot, got %d", len(sim.bots))
	}
	
	bot := sim.bots[1]
	if bot.Status != IDLE {
		t.Errorf("Expected IDLE bot status with no orders, got %s", bot.Status)
	}
}

func TestVIPPriority(t *testing.T) {
	sim := NewSimulation()
	
	// Add multiple orders
	sim.addOrder(NORMAL) // 1001
	sim.addOrder(NORMAL) // 1002
	sim.addOrder(VIP)    // 1003
	sim.addOrder(NORMAL) // 1004
	
	// Add a bot to start processing
	sim.addBot()
	
	// Give some time for processing to start
	time.Sleep(100 * time.Millisecond)
	
	// The VIP order (1003) should be processed first
	sim.mu.RLock()
	defer sim.mu.RUnlock()
	
	// Check that VIP order is being processed
	foundVIP := false
	for _, bot := range sim.bots {
		if bot.CurrentOrder != nil && bot.CurrentOrder.ID == 1003 {
			foundVIP = true
			break
		}
	}
	
	if !foundVIP {
		t.Error("Expected VIP order 1003 to be processed first")
	}
}

func TestBotRemovalWithActiveOrder(t *testing.T) {
	sim := NewSimulation()
	
	// Add an order and a bot
	sim.addOrder(NORMAL)
	sim.addBot()
	
	// Give time for processing to start
	time.Sleep(100 * time.Millisecond)
	
	// Remove the bot while it's processing
	sim.removeBot()
	
	// Check that order is back in pending
	sim.mu.RLock()
	defer sim.mu.RUnlock()
	
	if len(sim.pendingNormal) != 1 {
		t.Errorf("Expected 1 pending normal order, got %d", len(sim.pendingNormal))
	}
	
	if sim.pendingNormal[0].ID != 1001 {
		t.Errorf("Expected order 1001 to be back in pending, got %d", sim.pendingNormal[0].ID)
	}
	
	if sim.pendingNormal[0].Status != PENDING {
		t.Errorf("Expected order status to be PENDING, got %s", sim.pendingNormal[0].Status)
	}
}

func TestMultipleBots(t *testing.T) {
	sim := NewSimulation()
	
	// Add multiple orders
	sim.addOrder(NORMAL) // 1001
	sim.addOrder(VIP)    // 1002
	sim.addOrder(NORMAL) // 1003
	sim.addOrder(VIP)    // 1004
	
	// Add two bots
	sim.addBot()
	sim.addBot()
	
	// Give time for processing to start
	time.Sleep(100 * time.Millisecond)
	
	// Check that both bots are processing
	sim.mu.RLock()
	defer sim.mu.RUnlock()
	
	processingCount := 0
	for _, bot := range sim.bots {
		if bot.Status == ACTIVE && bot.CurrentOrder != nil {
			processingCount++
		}
	}
	
	if processingCount != 2 {
		t.Errorf("Expected 2 bots processing, got %d", processingCount)
	}
}