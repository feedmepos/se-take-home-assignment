package main

import (
	"testing"
	"time"
)

func TestNewOrderSystem(t *testing.T) {
	system := NewOrderSystem()
	if system == nil {
		t.Fatal("NewOrderSystem returned nil")
	}
	if len(system.pendingVIP) != 0 {
		t.Errorf("Expected empty pendingVIP, got %d", len(system.pendingVIP))
	}
	if len(system.pendingNormal) != 0 {
		t.Errorf("Expected empty pendingNormal, got %d", len(system.pendingNormal))
	}
	if len(system.completed) != 0 {
		t.Errorf("Expected empty completed, got %d", len(system.completed))
	}
	if len(system.bots) != 0 {
		t.Errorf("Expected empty bots, got %d", len(system.bots))
	}
	if system.nextOrderID != 1 {
		t.Errorf("Expected nextOrderID to be 1, got %d", system.nextOrderID)
	}
	if system.nextBotID != 1 {
		t.Errorf("Expected nextBotID to be 1, got %d", system.nextBotID)
	}
}

func TestCreateOrder(t *testing.T) {
	system := NewOrderSystem()

	// 创建普通订单
	order1 := system.CreateOrder(OrderTypeNormal)
	if order1.ID != 1 {
		t.Errorf("Expected order ID 1, got %d", order1.ID)
	}
	if order1.Type != OrderTypeNormal {
		t.Errorf("Expected order type NORMAL, got %s", order1.Type)
	}
	if order1.Status != StatusPending {
		t.Errorf("Expected order status PENDING, got %s", order1.Status)
	}
	if len(system.pendingNormal) != 1 {
		t.Errorf("Expected 1 pending normal order, got %d", len(system.pendingNormal))
	}
	if len(system.pendingVIP) != 0 {
		t.Errorf("Expected 0 pending VIP orders, got %d", len(system.pendingVIP))
	}

	// 创建VIP订单
	order2 := system.CreateOrder(OrderTypeVIP)
	if order2.ID != 2 {
		t.Errorf("Expected order ID 2, got %d", order2.ID)
	}
	if order2.Type != OrderTypeVIP {
		t.Errorf("Expected order type VIP, got %s", order2.Type)
	}
	if len(system.pendingVIP) != 1 {
		t.Errorf("Expected 1 pending VIP order, got %d", len(system.pendingVIP))
	}
	if len(system.pendingNormal) != 1 {
		t.Errorf("Expected 1 pending normal order, got %d", len(system.pendingNormal))
	}

	// 验证订单号唯一递增
	if order2.ID <= order1.ID {
		t.Errorf("Order IDs should be increasing: order1=%d, order2=%d", order1.ID, order2.ID)
	}
}

func TestCreateBot(t *testing.T) {
	system := NewOrderSystem()

	bot1 := system.CreateBot()
	if bot1.ID != 1 {
		t.Errorf("Expected bot ID 1, got %d", bot1.ID)
	}
	if !bot1.IsIdle {
		t.Error("Expected new bot to be idle")
	}
	if len(system.bots) != 1 {
		t.Errorf("Expected 1 bot, got %d", len(system.bots))
	}

	bot2 := system.CreateBot()
	if bot2.ID != 2 {
		t.Errorf("Expected bot ID 2, got %d", bot2.ID)
	}
	if len(system.bots) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(system.bots))
	}
}

func TestRemoveBot(t *testing.T) {
	system := NewOrderSystem()

	// 删除空系统中的机器人应该返回false
	if system.RemoveBot() {
		t.Error("Expected RemoveBot to return false when no bots exist")
	}

	// 创建机器人并删除
	system.CreateBot()
	system.CreateBot()
	if len(system.bots) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(system.bots))
	}

	// 删除最新的机器人（ID=2）
	if !system.RemoveBot() {
		t.Error("Expected RemoveBot to return true")
	}
	if len(system.bots) != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", len(system.bots))
	}

	// 验证删除的是ID最大的机器人
	for _, bot := range system.bots {
		if bot.ID != 1 {
			t.Errorf("Expected bot ID 1 to remain, got %d", bot.ID)
		}
	}
}

func TestRemoveBotWithProcessingOrder(t *testing.T) {
	system := NewOrderSystem()

	// 创建订单和机器人
	order := system.CreateOrder(OrderTypeNormal)
	bot := system.CreateBot()

	// 等待机器人开始处理订单
	time.Sleep(100 * time.Millisecond)

	// 验证机器人正在处理订单
	if bot.IsIdle {
		t.Error("Expected bot to be processing order")
	}
	if bot.CurrentOrder == nil {
		t.Error("Expected bot to have current order")
	}

	// 删除机器人
	system.RemoveBot()

	// 验证订单返回到待处理队列
	pending := system.GetAllPendingOrders()
	if len(pending) != 1 {
		t.Errorf("Expected 1 pending order after bot removal, got %d", len(pending))
	}
	if pending[0].ID != order.ID {
		t.Errorf("Expected order #%d to return to pending, got #%d", order.ID, pending[0].ID)
	}
	if pending[0].Status != StatusPending {
		t.Errorf("Expected order status to be PENDING, got %s", pending[0].Status)
	}
}

func TestVIPOrderPriority(t *testing.T) {
	system := NewOrderSystem()

	// 创建普通订单
	normal1 := system.CreateOrder(OrderTypeNormal)
	normal2 := system.CreateOrder(OrderTypeNormal)

	// 创建VIP订单
	vip1 := system.CreateOrder(OrderTypeVIP)
	vip2 := system.CreateOrder(OrderTypeVIP)

	// 创建机器人
	bot := system.CreateBot()

	// 等待机器人处理第一个订单
	time.Sleep(100 * time.Millisecond)

	// 机器人应该处理VIP订单（vip1）
	if bot.CurrentOrder.ID != vip1.ID {
		t.Errorf("Expected bot to process VIP order #%d, got #%d", vip1.ID, bot.CurrentOrder.ID)
	}

	// 验证待处理队列顺序：vip2, normal1, normal2
	pending := system.GetAllPendingOrders()
	if len(pending) != 3 {
		t.Fatalf("Expected 3 pending orders, got %d", len(pending))
	}
	if pending[0].ID != vip2.ID {
		t.Errorf("Expected first pending order to be VIP #%d, got #%d", vip2.ID, pending[0].ID)
	}
	if pending[1].ID != normal1.ID {
		t.Errorf("Expected second pending order to be normal #%d, got #%d", normal1.ID, pending[1].ID)
	}
	if pending[2].ID != normal2.ID {
		t.Errorf("Expected third pending order to be normal #%d, got #%d", normal2.ID, pending[2].ID)
	}
}

func TestBotProcessesMultipleOrders(t *testing.T) {
	system := NewOrderSystem()

	// 创建3个订单
	order1 := system.CreateOrder(OrderTypeNormal)
	order2 := system.CreateOrder(OrderTypeNormal)
	order3 := system.CreateOrder(OrderTypeNormal)

	// 创建1个机器人
	bot := system.CreateBot()

	// 验证机器人立即开始处理第一个订单
	time.Sleep(100 * time.Millisecond)
	if bot.CurrentOrder.ID != order1.ID {
		t.Errorf("Expected bot to process order #%d, got #%d", order1.ID, bot.CurrentOrder.ID)
	}

	// 验证待处理订单数量为2个（order2和order3）
	pending := system.GetAllPendingOrders()
	if len(pending) != 2 {
		t.Errorf("Expected 2 pending orders initially, got %d", len(pending))
	}

	// 清理：删除订单以释放资源
	_, _, _ = order1, order2, order3
}

func TestBotIdleState(t *testing.T) {
	system := NewOrderSystem()

	// 创建机器人但不创建订单
	bot := system.CreateBot()

	// 验证机器人处于空闲状态
	if !bot.IsIdle {
		t.Error("Expected bot to be idle when no orders")
	}
	if bot.CurrentOrder != nil {
		t.Error("Expected bot to have no current order")
	}

	// 创建订单
	system.CreateOrder(OrderTypeNormal)

	// 等待机器人开始处理
	time.Sleep(100 * time.Millisecond)

	// 验证机器人不再空闲
	if bot.IsIdle {
		t.Error("Expected bot to not be idle after order created")
	}
}

func TestGetStats(t *testing.T) {
	system := NewOrderSystem()

	// 先创建机器人（此时没有订单，机器人应该空闲）
	bot1 := system.CreateBot()
	bot2 := system.CreateBot()

	// 验证两个机器人都空闲
	if !bot1.IsIdle || !bot2.IsIdle {
		t.Error("Expected both bots to be idle when no orders")
	}

	// 创建1个订单
	system.CreateOrder(OrderTypeNormal)

	// 等待机器人开始处理
	time.Sleep(100 * time.Millisecond)

	stats := system.GetStats()

	// 验证统计信息
	if stats["pending_normal"] != 0 {
		t.Errorf("Expected 0 pending normal order (processed), got %d", stats["pending_normal"])
	}
	if stats["pending_vip"] != 0 {
		t.Errorf("Expected 0 pending VIP orders, got %d", stats["pending_vip"])
	}
	if stats["bots_total"] != 2 {
		t.Errorf("Expected 2 total bots, got %d", stats["bots_total"])
	}
	// 一个机器人在工作，一个空闲
	if stats["bots_working"] != 1 {
		t.Errorf("Expected 1 working bot, got %d", stats["bots_working"])
	}
	if stats["bots_idle"] != 1 {
		t.Errorf("Expected 1 idle bot, got %d", stats["bots_idle"])
	}
}

func TestGetAllPendingOrders(t *testing.T) {
	system := NewOrderSystem()

	// 创建多个订单
	system.CreateOrder(OrderTypeNormal)
	system.CreateOrder(OrderTypeVIP)
	system.CreateOrder(OrderTypeNormal)

	pending := system.GetAllPendingOrders()
	if len(pending) != 3 {
		t.Errorf("Expected 3 pending orders, got %d", len(pending))
	}

	// 验证VIP订单在前
	if pending[0].Type != OrderTypeVIP {
		t.Errorf("Expected first order to be VIP, got %s", pending[0].Type)
	}
}

func TestGetAllCompletedOrders(t *testing.T) {
	system := NewOrderSystem()

	// 没有已完成订单时
	completed := system.GetAllCompletedOrders()
	if len(completed) != 0 {
		t.Errorf("Expected 0 completed orders, got %d", len(completed))
	}
}

func TestGetAllBots(t *testing.T) {
	system := NewOrderSystem()

	// 没有机器人时
	bots := system.GetAllBots()
	if len(bots) != 0 {
		t.Errorf("Expected 0 bots, got %d", len(bots))
	}

	// 创建机器人
	system.CreateBot()
	system.CreateBot()

	bots = system.GetAllBots()
	if len(bots) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(bots))
	}
}

func TestFormatTime(t *testing.T) {
	// 测试时间格式化
	now := time.Now()
	formatted := FormatTime(now)

	// 验证格式为 HH:MM:SS
	if len(formatted) != 8 {
		t.Errorf("Expected formatted time to be 8 characters, got %d", len(formatted))
	}
	if formatted[2] != ':' || formatted[5] != ':' {
		t.Errorf("Expected format HH:MM:SS, got %s", formatted)
	}
}

func TestOrderIDUniqueness(t *testing.T) {
	system := NewOrderSystem()

	// 创建多个订单
	orders := make([]*Order, 10)
	for i := 0; i < 10; i++ {
		orders[i] = system.CreateOrder(OrderTypeNormal)
	}

	// 验证订单ID唯一
	idSet := make(map[int]bool)
	for _, order := range orders {
		if idSet[order.ID] {
			t.Errorf("Duplicate order ID: %d", order.ID)
		}
		idSet[order.ID] = true
	}

	// 验证订单ID递增
	for i := 1; i < len(orders); i++ {
		if orders[i].ID <= orders[i-1].ID {
			t.Errorf("Order IDs should be increasing: order[%d].ID=%d <= order[%d].ID=%d",
				i, orders[i].ID, i-1, orders[i-1].ID)
		}
	}
}

func TestConcurrency(t *testing.T) {
	system := NewOrderSystem()

	// 并发创建订单
	done := make(chan bool)
	for i := 0; i < 10; i++ {
		go func() {
			system.CreateOrder(OrderTypeNormal)
			done <- true
		}()
	}

	// 等待所有goroutine完成
	for i := 0; i < 10; i++ {
		<-done
	}

	// 验证创建了10个订单
	pending := system.GetAllPendingOrders()
	if len(pending) != 10 {
		t.Errorf("Expected 10 pending orders, got %d", len(pending))
	}

	// 并发创建机器人
	for i := 0; i < 5; i++ {
		go func() {
			system.CreateBot()
			done <- true
		}()
	}

	// 等待所有goroutine完成
	for i := 0; i < 5; i++ {
		<-done
	}

	// 验证创建了5个机器人
	bots := system.GetAllBots()
	if len(bots) != 5 {
		t.Errorf("Expected 5 bots, got %d", len(bots))
	}
}

func TestPrintResult(t *testing.T) {
	system := NewOrderSystem()

	// 创建一些订单和机器人
	system.CreateOrder(OrderTypeNormal)
	system.CreateOrder(OrderTypeVIP)
	system.CreateBot()

	result := system.PrintResult()

	// 验证输出包含关键信息
	if result == "" {
		t.Error("Expected non-empty result")
	}
	if len(result) < 100 {
		t.Errorf("Expected result to be longer, got %d characters", len(result))
	}
}
