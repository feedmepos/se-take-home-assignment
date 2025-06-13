package repository

import (
	"context"
	"testing"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/models"
)

func TestOrderPoolMemory_GenerateID(t *testing.T) {
	pool := &OrderPoolMemory{
		currentOrderID: 0,
	}
	ctx := context.Background()

	id1 := pool.GenerateID(ctx)
	if id1 != 1 {
		t.Errorf("Expected first ID to be 1, got %d", id1)
	}

	id2 := pool.GenerateID(ctx)
	if id2 != 2 {
		t.Errorf("Expected second ID to be 2, got %d", id2)
	}
}

func TestOrderPoolMemory_CreatePending(t *testing.T) {
	// 为每个测试初始化一个新的存储库
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// Test creating normal priority order
	customerID := int64(1001)
	order, err := pool.CreatePending(ctx, customerID, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create normal order: %v", err)
	}
	if order.CustomerID != customerID {
		t.Errorf("Expected customer ID to be %d, got %d", customerID, order.CustomerID)
	}
	if order.Priority != consts.OrderPriorityNormal {
		t.Errorf("Expected priority to be %d, got %d", consts.OrderPriorityNormal, order.Priority)
	}
	if order.Status != consts.OrderStatusPending {
		t.Errorf("Expected status to be %d, got %d", consts.OrderStatusPending, order.Status)
	}
	if pool.NormalPendingOrders.Len() != 1 {
		t.Errorf("Expected 1 normal pending order, got %d", pool.NormalPendingOrders.Len())
	}

	// Test creating VIP priority order
	vipCustomerID := int64(2001)
	vipOrder, err := pool.CreatePending(ctx, vipCustomerID, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("Failed to create VIP order: %v", err)
	}
	if vipOrder.CustomerID != vipCustomerID {
		t.Errorf("Expected customer ID to be %d, got %d", vipCustomerID, vipOrder.CustomerID)
	}
	if vipOrder.Priority != consts.OrderPriorityVip {
		t.Errorf("Expected priority to be %d, got %d", consts.OrderPriorityVip, vipOrder.Priority)
	}
	if pool.VipPendingOrders.Len() != 1 {
		t.Errorf("Expected 1 VIP pending order, got %d", pool.VipPendingOrders.Len())
	}
}

func TestOrderPoolMemory_HasVipPending(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// Initially there should be no VIP orders
	if pool.HasVipPending(ctx) {
		t.Error("Expected no VIP orders initially")
	}

	// Add a VIP order
	_, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("Failed to create VIP order: %v", err)
	}

	// Now there should be a VIP order
	if !pool.HasVipPending(ctx) {
		t.Error("Expected to have VIP orders after adding one")
	}
}

func TestOrderPoolMemory_TakePending(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// Create a normal order
	normalOrder, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create normal order: %v", err)
	}

	// Create a VIP order
	vipOrder, err := pool.CreatePending(ctx, 2001, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("Failed to create VIP order: %v", err)
	}

	// Take VIP order
	takenVipOrder, err := pool.TakePending(ctx, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("Failed to take VIP order: %v", err)
	}
	if takenVipOrder.ID != vipOrder.ID {
		t.Errorf("Expected VIP order ID to be %d, got %d", vipOrder.ID, takenVipOrder.ID)
	}
	if pool.VipPendingOrders.Len() != 0 {
		t.Errorf("After taking one VIP order, expected 0 VIP pending orders, got %d", pool.VipPendingOrders.Len())
	}

	// Take normal order
	takenNormalOrder, err := pool.TakePending(ctx, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to take normal order: %v", err)
	}
	if takenNormalOrder.ID != normalOrder.ID {
		t.Errorf("Expected normal order ID to be %d, got %d", normalOrder.ID, takenNormalOrder.ID)
	}
	if pool.NormalPendingOrders.Len() != 0 {
		t.Errorf("After taking one normal order, expected 0 normal pending orders, got %d", pool.NormalPendingOrders.Len())
	}
}

func TestOrderPoolMemory_FindByID(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// Create an order
	order, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Find order by ID
	foundOrder, err := pool.FindByID(ctx, order.ID)
	if err != nil {
		t.Fatalf("Failed to find order: %v", err)
	}
	if foundOrder == nil {
		t.Fatal("Expected to find order, got nil")
	}
	if foundOrder.ID != order.ID {
		t.Errorf("Expected order ID to be %d, got %d", order.ID, foundOrder.ID)
	}

	// Try to find non-existent order
	nonExistentOrder, err := pool.FindByID(ctx, 9999)
	if err != nil {
		t.Fatalf("Unexpected error when finding non-existent order: %v", err)
	}
	if nonExistentOrder != nil {
		t.Errorf("Expected nil for non-existent order, got %+v", nonExistentOrder)
	}
}

func TestOrderPoolMemory_ChangeStatusToProcessing(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// Create an order
	order, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Create a bot
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// Change order status to processing
	err = pool.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("Failed to change order status to processing: %v", err)
	}

	if order.Status != consts.OrderStatusProcessing {
		t.Errorf("Expected order status to be %d, got %d", consts.OrderStatusProcessing, order.Status)
	}
	if order.BotID != bot.ID {
		t.Errorf("Expected order bot ID to be %d, got %d", bot.ID, order.BotID)
	}
}

func TestOrderPoolMemory_ChangeStatusToCompleted(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// Create an order
	order, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Create a bot
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// First change order status to processing
	err = pool.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("Failed to change order status to processing: %v", err)
	}

	// Change order status to completed
	err = pool.ChangeStatusToCompleted(ctx, order)
	if err != nil {
		t.Fatalf("Failed to change order status to completed: %v", err)
	}

	if order.Status != consts.OrderStatusCompleted {
		t.Errorf("Expected order status to be %d, got %d", consts.OrderStatusCompleted, order.Status)
	}

	// Verify order is in the completed orders list
	if len(pool.CompletedOrders) != 1 {
		t.Errorf("Expected 1 completed order, got %d", len(pool.CompletedOrders))
	}
}

func TestOrderPoolMemory_ChangeStatusFromProcessingToPending(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// Create an order
	order, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Create a bot
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// Take order from pending queue
	_, err = pool.TakePending(ctx, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to take pending order: %v", err)
	}

	// Change order status to processing
	err = pool.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("Failed to change order status to processing: %v", err)
	}

	// Change order status from processing back to pending
	err = pool.ChangeStatusFromProcessingToPending(ctx, order)
	if err != nil {
		t.Fatalf("Failed to change order status from processing to pending: %v", err)
	}

	if order.Status != consts.OrderStatusPending {
		t.Errorf("Expected order status to be %d, got %d", consts.OrderStatusPending, order.Status)
	}
	if order.BotID != 0 {
		t.Errorf("Expected order bot ID to be 0, got %d", order.BotID)
	}

	// Verify order is back in the pending orders list
	if pool.NormalPendingOrders.Len() != 1 {
		t.Errorf("Expected 1 normal pending order, got %d", pool.NormalPendingOrders.Len())
	}
}

func TestOrderPoolMemory_FetchUncompleted(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// Create two orders
	order1, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order 1: %v", err)
	}

	order2, err := pool.CreatePending(ctx, 1002, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("Failed to create order 2: %v", err)
	}

	if order2 == nil {
		t.Fatalf("Failed to create order 2")
	}

	// Create a bot
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// Change order 1 status to processing
	err = pool.ChangeStatusToProcessing(ctx, order1, bot)
	if err != nil {
		t.Fatalf("Failed to change order status to processing: %v", err)
	}

	// Get uncompleted orders
	uncompleted, err := pool.FetchUncompleted(ctx)
	if err != nil {
		t.Fatalf("Failed to fetch uncompleted orders: %v", err)
	}

	if len(uncompleted) != 2 {
		t.Errorf("Expected 2 uncompleted orders, got %d", len(uncompleted))
	}

	if uncompleted[0].Priority != consts.OrderPriorityVip {
		t.Errorf("Expected VIP order to be prioritized, but Normal order was placed first")
	}

	// Complete order 1
	err = pool.ChangeStatusToCompleted(ctx, order1)
	if err != nil {
		t.Fatalf("Failed to change order status to completed: %v", err)
	}

	// Get uncompleted orders again
	uncompleted, err = pool.FetchUncompleted(ctx)
	if err != nil {
		t.Fatalf("Failed to fetch uncompleted orders: %v", err)
	}

	if len(uncompleted) != 1 {
		t.Errorf("After completing one order, expected 1 uncompleted order, got %d", len(uncompleted))
	}
}

func TestOrderPoolMemory_FetchRecentCompleted(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// Create three orders
	orders := make([]*models.Order, 3)
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	for i := 0; i < 3; i++ {
		order, err := pool.CreatePending(ctx, int64(1001+i), consts.OrderPriorityNormal)
		if err != nil {
			t.Fatalf("Failed to create order %d: %v", i+1, err)
		}
		orders[i] = order

		// Take order from pending queue
		_, err = pool.TakePending(ctx, consts.OrderPriorityNormal)
		if err != nil {
			t.Fatalf("Failed to take pending order %d: %v", i+1, err)
		}

		// Change to processing
		err = pool.ChangeStatusToProcessing(ctx, order, bot)
		if err != nil {
			t.Fatalf("Failed to change order %d status to processing: %v", i+1, err)
		}

		// Complete order
		err = pool.ChangeStatusToCompleted(ctx, order)
		if err != nil {
			t.Fatalf("Failed to change order %d status to completed: %v", i+1, err)
		}
	}

	// Get the 2 most recent completed orders
	completed, err := pool.FetchRecentCompleted(ctx, 2)
	if err != nil {
		t.Fatalf("Failed to fetch recent completed orders: %v", err)
	}

	if len(completed) != 2 {
		t.Errorf("Expected 2 recent completed orders, got %d", len(completed))
	}

	// Most recent orders should be the last ones created
	if completed[0].ID != orders[1].ID {
		t.Errorf("Expected first recent order ID to be %d, got %d", orders[1].ID, completed[0].ID)
	}
	if completed[1].ID != orders[2].ID {
		t.Errorf("Expected second recent order ID to be %d, got %d", orders[2].ID, completed[1].ID)
	}
}
