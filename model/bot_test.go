package model

import (
	"context"
	"testing"
)

// newTestBot 创建用于测试的 Bot 实例
func newTestBot(id int) *Bot {
	ctx, cancel := context.WithCancel(context.Background())
	return NewBot(id, ctx, cancel)
}

// TestNewBot 测试创建新的 Bot
func TestNewBot(t *testing.T) {
	bot := newTestBot(1)
	if bot == nil {
		t.Fatal("expected non-nil bot")
	}
	if bot.ID != 1 {
		t.Errorf("expected bot ID 1, got %d", bot.ID)
	}
	if bot.CurrentOrder != nil {
		t.Error("new bot should have no current order")
	}
	if bot.HasOrder() {
		t.Error("new bot should not have an order")
	}
}

// TestBotTakeOrder 测试 Bot 接单
func TestBotTakeOrder(t *testing.T) {
	bot := newTestBot(1)
	order := &Order{ID: 1001, Type: Normal, Status: OrderPending}

	bot.TakeOrder(order)

	if !bot.HasOrder() {
		t.Fatal("bot should have an order after TakeOrder")
	}
	if bot.CurrentOrder != order {
		t.Error("bot.CurrentOrder should be the taken order")
	}
	if bot.OrderID() != 1001 {
		t.Errorf("expected order ID 1001, got %d", bot.OrderID())
	}
	if bot.OrderType() != Normal {
		t.Errorf("expected order type Normal, got %v", bot.OrderType())
	}
}

// TestBotTakeVIPOrder 测试 Bot 接 VIP 订单
func TestBotTakeVIPOrder(t *testing.T) {
	bot := newTestBot(1)
	order := &Order{ID: 1002, Type: VIP, Status: OrderPending}

	bot.TakeOrder(order)

	if bot.OrderType() != VIP {
		t.Errorf("expected order type VIP, got %v", bot.OrderType())
	}
}

// TestBotCompleteOrder 测试 Bot 完成订单
func TestBotCompleteOrder(t *testing.T) {
	bot := newTestBot(1)
	order := &Order{ID: 1001, Type: Normal, Status: OrderProcessing}

	bot.TakeOrder(order)

	result := bot.CompleteOrder(order)
	if result == nil {
		t.Fatal("expected order to be returned on completion")
	}
	if result.Status != OrderComplete {
		t.Errorf("expected order status COMPLETE, got %v", result.Status)
	}
	if bot.HasOrder() {
		t.Error("bot should not have an order after completion")
	}
}

// TestBotCompleteOrderWrongOrder 测试完成不匹配的订单（防止竞态）
func TestBotCompleteOrderWrongOrder(t *testing.T) {
	bot := newTestBot(1)
	order1 := &Order{ID: 1001, Type: Normal}
	order2 := &Order{ID: 1002, Type: Normal}

	bot.TakeOrder(order1)

	// 尝试完成不匹配的订单
	result := bot.CompleteOrder(order2)
	if result != nil {
		t.Error("expected nil when completing wrong order (race prevention)")
	}
	if !bot.HasOrder() {
		t.Error("bot should still have the original order")
	}
}

// TestBotCompleteOrderAfterRelease 测试订单被释放后完成（竞态场景）
func TestBotCompleteOrderAfterRelease(t *testing.T) {
	bot := newTestBot(1)
	order := &Order{ID: 1001, Type: Normal, Status: OrderProcessing}

	bot.TakeOrder(order)
	bot.ReleaseOrder() // 模拟 RemoveBot 释放订单

	// 尝试完成已释放的订单（竞态：定时器在 cancel 后触发）
	result := bot.CompleteOrder(order)
	if result != nil {
		t.Error("expected nil when completing already released order")
	}
}

// TestBotReleaseOrder 测试 Bot 释放订单
func TestBotReleaseOrder(t *testing.T) {
	bot := newTestBot(1)
	order := &Order{ID: 1001, Type: Normal, Status: OrderProcessing}

	bot.TakeOrder(order)

	released := bot.ReleaseOrder()
	if released == nil {
		t.Fatal("expected order to be returned on release")
	}
	if released.Status != OrderPending {
		t.Errorf("expected released order status PENDING, got %v", released.Status)
	}
	if bot.HasOrder() {
		t.Error("bot should not have an order after release")
	}
}

// TestBotReleaseOrderWhenIdle 测试空闲 Bot 释放订单（无操作）
func TestBotReleaseOrderWhenIdle(t *testing.T) {
	bot := newTestBot(1)

	released := bot.ReleaseOrder()
	if released != nil {
		t.Error("expected nil when releasing order from idle bot")
	}
}

// TestBotCancel 测试 Bot 取消上下文
func TestBotCancel(t *testing.T) {
	bot := newTestBot(1)

	// 取消前 ctx 不应该完成
	select {
	case <-bot.Ctx.Done():
		t.Error("ctx should not be done before cancel")
	default:
	}

	bot.Cancel()

	// 取消后 ctx 应该完成
	select {
	case <-bot.Ctx.Done():
		// 正确
	default:
		t.Error("ctx should be done after cancel")
	}
}

// TestBotOrderTypeNilSafety 测试无订单时调用 OrderType
func TestBotOrderTypeNilSafety(t *testing.T) {
	bot := newTestBot(1)

	// 不应 panic
	orderType := bot.OrderType()
	// 返回 -1 表示无效（兼容旧行为前不 panic）
	_ = orderType
}

// TestBotOrderIDNilSafety 测试无订单时调用 OrderID
func TestBotOrderIDNilSafety(t *testing.T) {
	bot := newTestBot(1)

	// 不应 panic
	orderID := bot.OrderID()
	if orderID != 0 {
		t.Errorf("expected 0 for nil order ID, got %d", orderID)
	}
}

// TestOrderTypeString 测试订单类型字符串表示
func TestOrderTypeString(t *testing.T) {
	tests := []struct {
		orderType OrderType
		expected  string
	}{
		{Normal, "Normal"},
		{VIP, "VIP"},
		{OrderType(99), "Unknown"},
	}

	for _, tt := range tests {
		result := tt.orderType.String()
		if result != tt.expected {
			t.Errorf("OrderType(%d).String() = %q, want %q", tt.orderType, result, tt.expected)
		}
	}
}

// TestOrderStatusConstants 测试订单状态常量
func TestOrderStatusConstants(t *testing.T) {
	if OrderPending != 0 {
		t.Errorf("expected OrderPending = 0, got %d", OrderPending)
	}
	if OrderProcessing != 1 {
		t.Errorf("expected OrderProcessing = 1, got %d", OrderProcessing)
	}
	if OrderComplete != 2 {
		t.Errorf("expected OrderComplete = 2, got %d", OrderComplete)
	}
}

// TestBotMultipleOrders 测试 Bot 按顺序处理多个订单
func TestBotMultipleOrders(t *testing.T) {
	bot := newTestBot(1)

	// 处理第一个订单
	order1 := &Order{ID: 1001, Type: VIP, Status: OrderPending}
	bot.TakeOrder(order1)
	if bot.OrderID() != 1001 {
		t.Errorf("expected order ID 1001, got %d", bot.OrderID())
	}
	bot.CompleteOrder(order1)

	// 处理第二个订单
	order2 := &Order{ID: 1002, Type: Normal, Status: OrderPending}
	bot.TakeOrder(order2)
	if bot.OrderID() != 1002 {
		t.Errorf("expected order ID 1002, got %d", bot.OrderID())
	}
	bot.CompleteOrder(order2)

	if bot.HasOrder() {
		t.Error("bot should have no orders after completing both")
	}
}
