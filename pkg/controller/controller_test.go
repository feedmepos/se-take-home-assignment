package controller

import (
	"testing"
	"time"
)

func TestPendingQueue_VIPPriority(t *testing.T) {
	q := PendingQueue{}

	n1 := &Order{ID: 1, Type: Normal}
	v1 := &Order{ID: 2, Type: VIP}
	n2 := &Order{ID: 3, Type: Normal}
	v2 := &Order{ID: 4, Type: VIP}

	q.AddNormal(n1)
	q.AddVIP(v1)
	q.AddNormal(n2)
	q.AddVIP(v2)

	// 期望顺序：VIP1, VIP2, Normal1, Normal2
	expected := []int{v1.ID, v2.ID, n1.ID, n2.ID}
	orders := q.Orders()
	for i, want := range expected {
		if orders[i].ID != want {
			t.Errorf("position %d: expected ID %d, got %d", i, want, orders[i].ID)
		}
	}
}

func TestPendingQueue_Dequeue(t *testing.T) {
	q := PendingQueue{}
	if q.Dequeue() != nil {
		t.Errorf("expected nil when dequeue from empty queue")
	}

	o := &Order{ID: 1, Type: Normal}
	q.AddNormal(o)
	if q.Len() != 1 {
		t.Errorf("expected len 1, got %d", q.Len())
	}
	if got := q.Dequeue(); got != o {
		t.Errorf("expected to dequeue the same order")
	}
	if q.Len() != 0 {
		t.Errorf("expected len 0 after dequeue, got %d", q.Len())
	}
}

func TestPendingQueue_ReturnOrder(t *testing.T) {
	q := PendingQueue{}
	n := &Order{ID: 1, Type: Normal}
	v := &Order{ID: 2, Type: VIP}

	q.AddNormal(n)
	// 被中断的 VIP 订单应排到 Normal 之前
	q.ReturnOrder(v)

	orders := q.Orders()
	if orders[0].ID != v.ID {
		t.Errorf("expected returned VIP order at front")
	}
	if orders[1].ID != n.ID {
		t.Errorf("expected normal order after VIP")
	}
}

func TestOrderController_CreateNormalOrder(t *testing.T) {
	ctrl := NewOrderController()

	order := ctrl.CreateNormalOrder()

	if order.ID != 1 {
		t.Errorf("Expected order ID to be 1, got %d", order.ID)
	}

	if order.Type != Normal {
		t.Errorf("Expected order type to be Normal")
	}

	if order.Status != StatusPending {
		t.Errorf("Expected order status to be PENDING, got %s", order.Status)
	}

	if ctrl.GetTotalOrdersCreated() != 1 {
		t.Errorf("Expected total orders created to be 1, got %d", ctrl.GetTotalOrdersCreated())
	}

	if ctrl.GetPendingOrderCount() != 1 {
		t.Errorf("Expected pending orders count to be 1, got %d", ctrl.GetPendingOrderCount())
	}
}

func TestOrderController_CreateVIPOrder(t *testing.T) {
	ctrl := NewOrderController()

	// 先创建普通订单
	normalOrder := ctrl.CreateNormalOrder()

	// 创建 VIP 订单，应排在普通订单之前
	vipOrder := ctrl.CreateVIPOrder()

	if vipOrder.Type != VIP {
		t.Errorf("Expected order type to be VIP")
	}

	ctrl.mu.Lock()
	pending := ctrl.pendingQueue.Orders()
	if len(pending) != 2 {
		t.Errorf("Expected 2 orders in pending queue, got %d", len(pending))
	}

	if pending[0].ID != vipOrder.ID {
		t.Errorf("Expected VIP order to be first in queue")
	}

	if pending[1].ID != normalOrder.ID {
		t.Errorf("Expected normal order to be second in queue")
	}
	ctrl.mu.Unlock()
}

func TestOrderController_VIPOrderPriority(t *testing.T) {
	ctrl := NewOrderController()

	// 创建顺序：Normal, VIP, Normal, VIP
	normal1 := ctrl.CreateNormalOrder()
	vip1 := ctrl.CreateVIPOrder()
	normal2 := ctrl.CreateNormalOrder()
	vip2 := ctrl.CreateVIPOrder()

	// 期望队列顺序：VIP1, VIP2, Normal1, Normal2
	ctrl.mu.Lock()
	expectedOrder := []int{vip1.ID, vip2.ID, normal1.ID, normal2.ID}
	pending := ctrl.pendingQueue.Orders()

	for i, expectedID := range expectedOrder {
		if pending[i].ID != expectedID {
			t.Errorf("Queue position %d: expected order ID %d, got %d", i, expectedID, pending[i].ID)
		}
	}
	ctrl.mu.Unlock()
}

func TestOrderController_AddBot(t *testing.T) {
	ctrl := NewOrderController()

	bot := ctrl.AddBot()

	if bot.ID != 1 {
		t.Errorf("Expected bot ID to be 1, got %d", bot.ID)
	}

	if bot.Status != Idle {
		t.Errorf("Expected bot status to be Idle")
	}

	if ctrl.GetActiveBotCount() != 1 {
		t.Errorf("Expected active bot count to be 1, got %d", ctrl.GetActiveBotCount())
	}
}

func TestOrderController_BotProcessesOrder(t *testing.T) {
	ctrl := NewOrderController()

	// 创建订单
	order := ctrl.CreateNormalOrder()

	// 新增机器人，应立即开始处理
	bot := ctrl.AddBot()

	// 等待处理启动
	time.Sleep(100 * time.Millisecond)

	ctrl.mu.Lock()
	if bot.Status != Processing {
		t.Errorf("Expected bot to be processing")
	}

	if bot.CurrentOrder == nil || bot.CurrentOrder.ID != order.ID {
		t.Errorf("Expected bot to be processing the created order")
	}

	if order.Status != StatusProcessing {
		t.Errorf("Expected order status to be PROCESSING, got %s", order.Status)
	}

	if ctrl.pendingQueue.Len() != 0 {
		t.Errorf("Expected pending queue to be empty, got %d orders", ctrl.pendingQueue.Len())
	}
	ctrl.mu.Unlock()
}

func TestOrderController_RemoveBot(t *testing.T) {
	ctrl := NewOrderController()

	// 创建两个机器人
	bot1 := ctrl.AddBot()
	bot2 := ctrl.AddBot()

	// 移除最新加入的机器人（bot2）
	removedBot := ctrl.RemoveBot()

	if removedBot.ID != bot2.ID {
		t.Errorf("Expected to remove bot2 (ID: %d), got bot ID: %d", bot2.ID, removedBot.ID)
	}

	if ctrl.GetActiveBotCount() != 1 {
		t.Errorf("Expected 1 active bot after removal, got %d", ctrl.GetActiveBotCount())
	}

	// 剩余应为 bot1
	ctrl.mu.Lock()
	if ctrl.bots[0].ID != bot1.ID {
		t.Errorf("Expected remaining bot to be bot1")
	}
	ctrl.mu.Unlock()
}

func TestOrderController_RemoveBotWhileProcessing(t *testing.T) {
	ctrl := NewOrderController()

	// 创建订单与机器人
	order := ctrl.CreateNormalOrder()
	bot := ctrl.AddBot()

	// 等待处理启动
	time.Sleep(100 * time.Millisecond)

	// 确认机器人正在处理
	ctrl.mu.Lock()
	if bot.Status != Processing {
		t.Errorf("Expected bot to be processing")
	}
	ctrl.mu.Unlock()

	// 移除正在处理的机器人
	removedBot := ctrl.RemoveBot()

	if removedBot.ID != bot.ID {
		t.Errorf("Expected to remove the processing bot")
	}

	// 订单应回到待处理队列
	if ctrl.GetPendingOrderCount() != 1 {
		t.Errorf("Expected order to be back in pending queue")
	}

	ctrl.mu.Lock()
	pending := ctrl.pendingQueue.Orders()
	if pending[0].ID != order.ID {
		t.Errorf("Expected the interrupted order to be back in pending queue")
	}

	if pending[0].Status != StatusPending {
		t.Errorf("Expected order status to be PENDING after bot removal")
	}
	ctrl.mu.Unlock()
}

func TestOrderController_OrderCompletion(t *testing.T) {
	ctrl := NewOrderController()

	// 创建订单与机器人
	order := ctrl.CreateNormalOrder()
	ctrl.AddBot()

	// 等待处理完成（略大于 10 秒）
	time.Sleep(11 * time.Second)

	// 订单应已完成
	if ctrl.GetCompletedOrderCount() != 1 {
		t.Errorf("Expected 1 completed order, got %d", ctrl.GetCompletedOrderCount())
	}

	ctrl.mu.Lock()
	if len(ctrl.completedOrders) != 1 {
		t.Errorf("Expected 1 order in completed orders")
	}

	if ctrl.completedOrders[0].ID != order.ID {
		t.Errorf("Expected the created order to be completed")
	}

	if ctrl.completedOrders[0].Status != StatusComplete {
		t.Errorf("Expected completed order status to be COMPLETE")
	}
	ctrl.mu.Unlock()
}

func TestOrderController_EmptyQueue(t *testing.T) {
	ctrl := NewOrderController()

	// 无订单时新增机器人
	bot := ctrl.AddBot()

	// 机器人应保持空闲
	time.Sleep(100 * time.Millisecond)

	if bot.Status != Idle {
		t.Errorf("Expected bot to remain idle when no orders available")
	}

	if bot.CurrentOrder != nil {
		t.Errorf("Expected bot to have no current order")
	}
}
