package main

import (
	"testing"
	"time"
)

func TestOrderPriority(t *testing.T) {
	system := NewSystem()

	// Add orders in specific order
	system.AddOrder("Normal")
	system.AddOrder("VIP")
	system.AddOrder("Normal")
	system.AddOrder("VIP")

	// Check queue order
	system.mu.RLock()
	defer system.mu.RUnlock()

	// Get pending orders in order
	pending := make([]*Order, 0, system.pendingQueue.Len())
	for _, order := range *system.pendingQueue {
		pending = append(pending, order)
	}

	// First two should be VIP
	if pending[0].Type != "VIP" {
		t.Errorf("Expected first order to be VIP, got %s", pending[0].Type)
	}
	if pending[1].Type != "VIP" {
		t.Errorf("Expected second order to be VIP, got %s", pending[1].Type)
	}

	// Next two should be Normal
	if pending[2].Type != "Normal" {
		t.Errorf("Expected third order to be Normal, got %s", pending[2].Type)
	}
	if pending[3].Type != "Normal" {
		t.Errorf("Expected fourth order to be Normal, got %s", pending[3].Type)
	}
}

func TestBotManagement(t *testing.T) {
	system := NewSystem()

	// Initially 0 bots
	if system.GetBotCount() != 0 {
		t.Errorf("Expected 0 bots, got %d", system.GetBotCount())
	}

	// Add a bot
	system.AddBot()
	if system.GetBotCount() != 1 {
		t.Errorf("Expected 1 bot, got %d", system.GetBotCount())
	}

	// Add another bot
	system.AddBot()
	if system.GetBotCount() != 2 {
		t.Errorf("Expected 2 bots, got %d", system.GetBotCount())
	}

	// Remove a bot
	system.RemoveBot()
	if system.GetBotCount() != 1 {
		t.Errorf("Expected 1 bot, got %d", system.GetBotCount())
	}
}

func TestOrderProcessing(t *testing.T) {
	system := NewSystem()
	system.AddBot()

	system.AddOrder("Normal")

	start := time.Now()
	system.WaitForOrdersComplete()

	if system.GetPendingCount() != 0 {
		t.Errorf("Expected 0 pending orders, got %d", system.GetPendingCount())
	}

	t.Logf("Order processed successfully in %v", time.Since(start))
}

func TestVIPPriority(t *testing.T) {
	system := NewSystem()
	system.AddBot()

	// 记录订单
	normal1 := system.AddOrder("Normal")
	vip := system.AddOrder("VIP")
	normal2 := system.AddOrder("Normal")

	// 等待所有订单完成
	system.WaitForOrdersComplete()

	// 检查完成数量
	system.mu.RLock()
	completeCount := len(system.completeList)
	system.mu.RUnlock()

	if completeCount != 3 {
		t.Errorf("Expected 3 completed orders, got %d", completeCount)
	}

	// 检查订单是否都完成了
	system.mu.RLock()
	order1Completed := false
	order2Completed := false
	order3Completed := false

	for _, order := range system.completeList {
		if order.ID == normal1.ID {
			order1Completed = true
		}
		if order.ID == vip.ID {
			order2Completed = true
		}
		if order.ID == normal2.ID {
			order3Completed = true
		}
	}
	system.mu.RUnlock()

	if !order1Completed {
		t.Errorf("Normal order #%d not completed", normal1.ID)
	}
	if !order2Completed {
		t.Errorf("VIP order #%d not completed", vip.ID)
	}
	if !order3Completed {
		t.Errorf("Normal order #%d not completed", normal2.ID)
	}

	// 验证 VIP 在第二个 Normal 订单之前处理（通过检查完成时间）
	system.mu.RLock()
	var vipOrder, normal2Order *Order
	for _, order := range system.completeList {
		if order.ID == vip.ID {
			vipOrder = order
		}
		if order.ID == normal2.ID {
			normal2Order = order
		}
	}
	system.mu.RUnlock()

	if vipOrder != nil && normal2Order != nil {
		if vipOrder.CompletedAt.After(normal2Order.CompletedAt) {
			t.Errorf("VIP order completed after Normal order (VIP: %v, Normal: %v)",
				vipOrder.CompletedAt, normal2Order.CompletedAt)
		}
	}
}

func TestBotRemovalDuringProcessing(t *testing.T) {
	system := NewSystem()
	system.AddBot()

	// Add order
	system.AddOrder("Normal")

	// Wait a bit for processing to start
	//time.Sleep(1 * time.Second)

	// Remove bot (should interrupt processing)
	system.RemoveBot()

	// Check that order is back in pending
	if system.GetPendingCount() != 1 {
		t.Errorf("Expected 1 pending order, got %d", system.GetPendingCount())
	}

	if system.GetCompleteCount() != 0 {
		t.Errorf("Expected 0 completed orders, got %d", system.GetCompleteCount())
	}
}

func TestMultipleBots(t *testing.T) {
	system := NewSystem()

	// Add 3 bots
	for i := 0; i < 3; i++ {
		system.AddBot()
	}

	// Add 5 orders
	for i := 0; i < 5; i++ {
		if i%2 == 0 {
			system.AddOrder("VIP")
		} else {
			system.AddOrder("Normal")
		}
	}

	// Wait for processing
	time.Sleep(5 * time.Second)

	// At least some orders should be completed
	if system.GetCompleteCount() == 0 {
		t.Errorf("Expected at least 1 completed order, got 0")
	}
}
