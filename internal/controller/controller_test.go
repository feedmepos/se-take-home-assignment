package controller

import (
	"testing"
	"time"
)

func TestAddNormalOrder(t *testing.T) {
	c := New()
	o := c.AddNormalOrder()

	if o.ID != 1001 {
		t.Errorf("expected ID 1001, got %d", o.ID)
	}
	if o.Type != OrderNormal {
		t.Errorf("expected Normal type, got %v", o.Type)
	}
	if o.Status != OrderPending {
		t.Errorf("expected PENDING, got %v", o.Status)
	}
}

func TestAddVIPOrder(t *testing.T) {
	c := New()
	o := c.AddVIPOrder()

	if o.ID != 1001 {
		t.Errorf("expected ID 1001, got %d", o.ID)
	}
	if o.Type != OrderVIP {
		t.Errorf("expected VIP type, got %v", o.Type)
	}
	if o.Status != OrderPending {
		t.Errorf("expected PENDING, got %v", o.Status)
	}
}

func TestVIPOrderBehindExistingVIP(t *testing.T) {
	c := New()
	v1 := c.AddVIPOrder()
	c.AddNormalOrder()
	v2 := c.AddVIPOrder()

	c.mu.Lock()
	if len(c.vipQueue) != 2 {
		t.Fatalf("expected 2 VIP orders, got %d", len(c.vipQueue))
	}
	if c.vipQueue[0].ID != v1.ID {
		t.Errorf("v1 should be at front, got #%d", c.vipQueue[0].ID)
	}
	if c.vipQueue[1].ID != v2.ID {
		t.Errorf("v2 should be at back, got #%d", c.vipQueue[1].ID)
	}
	c.mu.Unlock()
}

func TestOrderIDsSequential(t *testing.T) {
	c := New()
	o1 := c.AddNormalOrder()
	o2 := c.AddVIPOrder()
	o3 := c.AddNormalOrder()

	if o1.ID != 1001 || o2.ID != 1002 || o3.ID != 1003 {
		t.Errorf("expected 1001,1002,1003, got %d,%d,%d", o1.ID, o2.ID, o3.ID)
	}
}

func TestBotPicksVIPFirst(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddVIPOrder()

	bot := c.AddBot()
	time.Sleep(200 * time.Millisecond)

	c.mu.Lock()
	if bot.order == nil {
		c.mu.Unlock()
		t.Fatal("bot should have an order")
	}
	if bot.order.Type != OrderVIP {
		t.Errorf("expected bot to pick VIP, got %v", bot.order.Type)
	}
	if bot.order.Status != OrderProcessing {
		t.Errorf("expected PROCESSING, got %v", bot.order.Status)
	}
	c.mu.Unlock()
}

func TestBotCompletesOrder(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddBot()

	time.Sleep(11 * time.Second)

	if c.CompletedCount() != 1 {
		t.Errorf("expected 1 completed, got %d", c.CompletedCount())
	}
}

func TestRemoveIdleBot(t *testing.T) {
	c := New()
	c.AddBot()

	if c.BotCount() != 1 {
		t.Fatalf("expected 1 bot, got %d", c.BotCount())
	}

	removed := c.RemoveBot()
	if removed == nil {
		t.Fatal("expected bot to be removed")
	}
	if c.BotCount() != 0 {
		t.Errorf("expected 0 bots, got %d", c.BotCount())
	}
}

func TestRemoveActiveBotReturnsOrder(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddVIPOrder()
	_ = c.AddBot()

	time.Sleep(200 * time.Millisecond)

	removed := c.RemoveBot()
	if removed == nil {
		t.Fatal("expected bot to be removed")
	}

	c.mu.Lock()
	if len(c.vipQueue) != 1 {
		t.Errorf("expected 1 VIP order returned, got %d", len(c.vipQueue))
	}
	if c.vipQueue[0].Status != OrderPending {
		t.Errorf("expected PENDING status after return, got %v", c.vipQueue[0].Status)
	}
	c.mu.Unlock()
}

func TestMultipleBotsProcessInParallel(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddVIPOrder()
	c.AddNormalOrder()

	c.AddBot()
	c.AddBot()

	time.Sleep(500 * time.Millisecond)

	c.mu.Lock()
	processingCount := 0
	for _, b := range c.bots {
		if b.order != nil {
			processingCount++
		}
	}
	if processingCount != 2 {
		t.Errorf("expected 2 bots processing, got %d", processingCount)
	}
	c.mu.Unlock()
}

func TestBotProcessesNextAfterCompletion(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddVIPOrder()
	c.AddBot()

	time.Sleep(200 * time.Millisecond)
	c.AddNormalOrder()

	// Wait for first order to complete (10s)
	time.Sleep(11 * time.Second)

	// First order should be done, second should be processing
	if c.CompletedCount() != 1 {
		t.Errorf("expected 1 completed after 11s, got %d", c.CompletedCount())
	}

	// Wait for second order to complete (another 10s)
	time.Sleep(11 * time.Second)

	if c.CompletedCount() != 2 {
		t.Errorf("expected 2 completed after 22s, got %d", c.CompletedCount())
	}
}

func TestNewOrderWakesIdleBot(t *testing.T) {
	c := New()
	bot := c.AddBot()

	time.Sleep(200 * time.Millisecond)

	c.mu.Lock()
	hasOrder := bot.order != nil
	c.mu.Unlock()
	if hasOrder {
		t.Fatal("bot should be idle initially")
	}

	c.AddNormalOrder()

	time.Sleep(200 * time.Millisecond)

	c.mu.Lock()
	if bot.order == nil {
		c.mu.Unlock()
		t.Fatal("bot should have picked up new order")
	}
	if bot.order.Status != OrderProcessing {
		t.Errorf("expected PROCESSING, got %v", bot.order.Status)
	}
	c.mu.Unlock()
}

func TestRemoveNonExistentBot(t *testing.T) {
	c := New()
	if removed := c.RemoveBot(); removed != nil {
		t.Errorf("expected nil, got bot #%d", removed.ID)
	}
}

func TestBotPicksNoOrderWhenQueueEmpty(t *testing.T) {
	c := New()
	bot := c.AddBot()

	time.Sleep(200 * time.Millisecond)

	c.mu.Lock()
	hasOrder := bot.order != nil
	c.mu.Unlock()
	if hasOrder {
		t.Errorf("expected idle bot, got order")
	}
}
