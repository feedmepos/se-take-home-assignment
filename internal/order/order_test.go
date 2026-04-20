package order

import (
	"testing"
)

// TestNewOrderManager 测试创建订单管理器
func TestNewOrderManager(t *testing.T) {
	om := NewOrderManager()
	if om == nil {
		t.Error("Expected OrderManager to be created")
	}
	if om.nextID != 1 {
		t.Errorf("Expected nextID to be 1, got %d", om.nextID)
	}
}

// TestAddOrder 测试添加订单
func TestAddOrder(t *testing.T) {
	om := NewOrderManager()
	
	// 添加普通订单
	order1 := om.AddOrder(NormalOrder)
	if order1.ID != 1 {
		t.Errorf("Expected order ID 1, got %d", order1.ID)
	}
	if order1.Type != NormalOrder {
		t.Errorf("Expected NormalOrder, got %v", order1.Type)
	}
	if order1.Status != Pending {
		t.Errorf("Expected Pending status, got %v", order1.Status)
	}
	
	// 添加VIP订单
	order2 := om.AddOrder(VIPOrder)
	if order2.ID != 2 {
		t.Errorf("Expected order ID 2, got %d", order2.ID)
	}
	if order2.Type != VIPOrder {
		t.Errorf("Expected VIPOrder, got %v", order2.Type)
	}
}

// TestPriorityQueue 测试优先级队列
func TestPriorityQueue(t *testing.T) {
	om := NewOrderManager()
	
	// 添加两个普通订单
	om.AddOrder(NormalOrder) // Order #1
	om.AddOrder(NormalOrder) // Order #2
	
	// 添加一个VIP订单，应该插入到前面
	vipOrder := om.AddOrder(VIPOrder) // Order #3
	
	// 获取下一个待处理订单应该是VIP订单
	nextOrder := om.GetNextPendingOrder()
	if nextOrder.ID != vipOrder.ID {
		t.Errorf("Expected VIP order #%d to be processed first, got order #%d", vipOrder.ID, nextOrder.ID)
	}
}

// TestGetNextPendingOrder 测试获取下一个待处理订单
func TestGetNextPendingOrder(t *testing.T) {
	om := NewOrderManager()
	
	// 添加订单
	om.AddOrder(NormalOrder)
	om.AddOrder(VIPOrder)
	
	// 获取第一个订单（应该是VIP）
	order1 := om.GetNextPendingOrder()
	if order1 == nil {
		t.Error("Expected to get an order")
	}
	if order1.Status != Processing {
		t.Errorf("Expected Processing status, got %v", order1.Status)
	}
	
	// 获取第二个订单
	order2 := om.GetNextPendingOrder()
	if order2 == nil {
		t.Error("Expected to get second order")
	}
	
	// 没有更多订单了
	order3 := om.GetNextPendingOrder()
	if order3 != nil {
		t.Error("Expected no more orders")
	}
}

// TestCompleteOrder 测试完成订单
func TestCompleteOrder(t *testing.T) {
	om := NewOrderManager()
	
	// 添加并处理订单
	order := om.AddOrder(NormalOrder)
	om.GetNextPendingOrder() // 将订单状态改为Processing
	
	// 完成订单
	success := om.CompleteOrder(order.ID)
	if !success {
		t.Error("Expected to complete order successfully")
	}
	
	// 检查订单是否已完成
	if om.GetCompletedOrdersCount() != 1 {
		t.Errorf("Expected 1 completed order, got %d", om.GetCompletedOrdersCount())
	}
}

// TestReturnOrderToQueue 测试将订单返回队列
func TestReturnOrderToQueue(t *testing.T) {
	om := NewOrderManager()
	
	// 添加订单并处理
	order := om.AddOrder(NormalOrder)
	om.GetNextPendingOrder()
	
	// 将订单返回队列
	om.ReturnOrderToQueue(order)
	
	// 检查订单状态是否为Pending
	if order.Status != Pending {
		t.Errorf("Expected Pending status after returning to queue, got %v", order.Status)
	}
	
	// 应该能再次获取到这个订单
	nextOrder := om.GetNextPendingOrder()
	if nextOrder == nil || nextOrder.ID != order.ID {
		t.Error("Expected to get the returned order")
	}
}
