package service

import (
	"context"
	"testing"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/errdef"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/repository"
)

func initOrder() {
	// Initialize repository
	repository.InitOrderRepository()
	// Initialize service
	InitOrderService()
}

func TestOrderServiceImpl_Create(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// Test creating normal priority order
	customerID := int64(1001)
	orderID, err := service.Create(ctx, customerID, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create normal order: %v", err)
	}
	if orderID <= 0 {
		t.Errorf("Expected order ID > 0, got %d", orderID)
	}

	// Test creating VIP priority order
	vipCustomerID := int64(2001)
	vipOrderID, err := service.Create(ctx, vipCustomerID, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("Failed to create VIP order: %v", err)
	}
	if vipOrderID <= 0 {
		t.Errorf("Expected VIP order ID > 0, got %d", vipOrderID)
	}

	// Test creating invalid priority order
	invalidOrderID, err := service.Create(ctx, customerID, consts.OrderPriority(999))
	if err != errdef.ErrOrderPriorityInvalid {
		t.Errorf("Expected error %v, got %v", errdef.ErrOrderPriorityInvalid, err)
	}
	if invalidOrderID != 0 {
		t.Errorf("Expected invalid order ID to be 0, got %d", invalidOrderID)
	}
}

func TestOrderServiceImpl_FindByID(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// Create an order
	customerID := int64(1001)
	orderID, err := service.Create(ctx, customerID, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Find order by ID
	order, err := service.FindByID(ctx, orderID)
	if err != nil {
		t.Fatalf("Failed to find order: %v", err)
	}
	if order == nil {
		t.Fatal("Expected to find order, got nil")
	}
	if order.ID != orderID {
		t.Errorf("Expected order ID to be %d, got %d", orderID, order.ID)
	}
	if order.CustomerID != customerID {
		t.Errorf("Expected customer ID to be %d, got %d", customerID, order.CustomerID)
	}

	// Try to find non-existent order
	nonExistentOrder, err := service.FindByID(ctx, 9999)
	if err != nil {
		t.Fatalf("Unexpected error when finding non-existent order: %v", err)
	}
	if nonExistentOrder != nil {
		t.Errorf("Expected non-existent order to return nil, got %+v", nonExistentOrder)
	}
}

func TestOrderServiceImpl_FindUncompleted(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// Initially there should be no uncompleted orders
	uncompleted, err := service.FindUncompleted(ctx)
	if err != nil {
		t.Fatalf("Failed to find uncompleted orders: %v", err)
	}
	if len(uncompleted) != 0 {
		t.Errorf("Expected no uncompleted orders initially, got %d", len(uncompleted))
	}

	// Create two orders
	_, err = service.Create(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create normal order: %v", err)
	}

	_, err = service.Create(ctx, 2001, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("Failed to create VIP order: %v", err)
	}

	// Find uncompleted orders
	uncompleted, err = service.FindUncompleted(ctx)
	if err != nil {
		t.Fatalf("Failed to find uncompleted orders: %v", err)
	}
	if len(uncompleted) != 2 {
		t.Errorf("Expected 2 uncompleted orders, got %d", len(uncompleted))
	}
}

func TestOrderServiceImpl_FindRecentCompleted(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// Initially there should be no completed orders
	completed, err := service.FindRecentCompleted(ctx, 10)
	if err != nil {
		t.Fatalf("Failed to find completed orders: %v", err)
	}
	if len(completed) != 0 {
		t.Errorf("Expected no completed orders initially, got %d", len(completed))
	}

	// Create three orders and complete them
	orderIDs := make([]int64, 3)
	for i := 0; i < 3; i++ {
		orderID, err := service.Create(ctx, int64(1001+i), consts.OrderPriorityNormal)
		if err != nil {
			t.Fatalf("Failed to create order %d: %v", i+1, err)
		}
		orderIDs[i] = orderID

		// Get order object
		order, err := service.FindByID(ctx, orderID)
		if err != nil {
			t.Fatalf("Failed to find order %d: %v", i+1, err)
		}

		// Create a bot
		bot := &models.Bot{
			ID:     int64(i + 1),
			Status: consts.BotStatusIdle,
		}

		// Change order status to processing
		err = service.ChangeStatusToProcessing(ctx, order, bot)
		if err != nil {
			t.Fatalf("Failed to change order %d status to processing: %v", i+1, err)
		}

		// Change order status to completed
		err = service.ChangeStatusToCompleted(ctx, order)
		if err != nil {
			t.Fatalf("Failed to change order %d status to completed: %v", i+1, err)
		}
	}

	// Find the 2 most recent completed orders
	completed, err = service.FindRecentCompleted(ctx, 2)
	if err != nil {
		t.Fatalf("Failed to find completed orders: %v", err)
	}
	if len(completed) != 2 {
		t.Errorf("Expected 2 completed orders, got %d", len(completed))
	}

	// Verify the most recent orders are the last ones created
	if completed[0].ID != orderIDs[1] {
		t.Errorf("Expected first recent order ID to be %d, got %d", orderIDs[1], completed[0].ID)
	}
	if completed[1].ID != orderIDs[2] {
		t.Errorf("Expected second recent order ID to be %d, got %d", orderIDs[2], completed[1].ID)
	}
}

func TestOrderServiceImpl_ChangeStatusToProcessing(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// Create an order
	orderID, err := service.Create(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Get order object
	order, err := service.FindByID(ctx, orderID)
	if err != nil {
		t.Fatalf("Failed to find order: %v", err)
	}

	// Create a bot
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// Change order status to processing
	err = service.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("Failed to change order status to processing: %v", err)
	}

	if order.Status != consts.OrderStatusProcessing {
		t.Errorf("Expected order status to be processing(%d), got %d", consts.OrderStatusProcessing, order.Status)
	}
	if order.BotID != bot.ID {
		t.Errorf("Expected order bot ID to be %d, got %d", bot.ID, order.BotID)
	}

	// Test nil order
	err = service.ChangeStatusToProcessing(ctx, nil, bot)
	if err != errdef.ErrOrderNotFound {
		t.Errorf("Expected error %v, got %v", errdef.ErrOrderNotFound, err)
	}

	// Test nil bot
	err = service.ChangeStatusToProcessing(ctx, order, nil)
	if err != errdef.ErrBotNotFound {
		t.Errorf("Expected error %v, got %v", errdef.ErrBotNotFound, err)
	}
}

func TestOrderServiceImpl_ChangeStatusToCompleted(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// Create an order
	orderID, err := service.Create(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Get order object
	order, err := service.FindByID(ctx, orderID)
	if err != nil {
		t.Fatalf("Failed to find order: %v", err)
	}

	// Create a bot
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// First change order status to processing
	err = service.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("Failed to change order status to processing: %v", err)
	}

	// Change order status to completed
	err = service.ChangeStatusToCompleted(ctx, order)
	if err != nil {
		t.Fatalf("Failed to change order status to completed: %v", err)
	}

	if order.Status != consts.OrderStatusCompleted {
		t.Errorf("Expected order status to be completed(%d), got %d", consts.OrderStatusCompleted, order.Status)
	}

	// Test nil order
	err = service.ChangeStatusToCompleted(ctx, nil)
	if err != errdef.ErrOrderNotFound {
		t.Errorf("Expected error %v, got %v", errdef.ErrOrderNotFound, err)
	}

	// Test order with mismatched status
	newOrder, err := service.Create(ctx, 2001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create new order: %v", err)
	}
	newOrderObj, _ := service.FindByID(ctx, newOrder)
	err = service.ChangeStatusToCompleted(ctx, newOrderObj)
	if err != errdef.ErrOrderStatusNotMatch {
		t.Errorf("Expected error %v, got %v", errdef.ErrOrderStatusNotMatch, err)
	}
}

func TestOrderServiceImpl_ResetOrder(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// Create an order
	orderID, err := service.Create(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to create order: %v", err)
	}

	// Get order object
	order, err := service.FindByID(ctx, orderID)
	if err != nil {
		t.Fatalf("Failed to find order: %v", err)
	}

	// Create a bot
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// Take order from pending queue
	_, err = repository.GetOrderRepository().TakePending(ctx, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("Failed to take pending order: %v", err)
	}

	// Change order status to processing
	err = service.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("Failed to change order status to processing: %v", err)
	}

	// Reset order
	err = service.ResetOrder(ctx, order)
	if err != nil {
		t.Fatalf("Failed to reset order: %v", err)
	}

	if order.Status != consts.OrderStatusPending {
		t.Errorf("Expected order status to be pending(%d), got %d", consts.OrderStatusPending, order.Status)
	}
	if order.BotID != 0 {
		t.Errorf("Expected order bot ID to be 0, got %d", order.BotID)
	}

	// Test nil order
	err = service.ResetOrder(ctx, nil)
	if err != nil {
		t.Errorf("Resetting nil order should not return error, got %v", err)
	}
}

func TestOrderServiceImpl_MultipleOperations(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// Create multiple orders
	orderIDs := make([]int64, 3)
	for i := 0; i < 3; i++ {
		priority := consts.OrderPriorityNormal
		if i == 1 {
			priority = consts.OrderPriorityVip
		}

		orderID, err := service.Create(ctx, int64(1001+i), priority)
		if err != nil {
			t.Fatalf("Failed to create order %d: %v", i+1, err)
		}
		orderIDs[i] = orderID
	}

	// Find uncompleted orders
	uncompleted, err := service.FindUncompleted(ctx)
	if err != nil {
		t.Fatalf("Failed to find uncompleted orders: %v", err)
	}
	if len(uncompleted) != 3 {
		t.Errorf("Expected 3 uncompleted orders, got %d", len(uncompleted))
	}

	// Process the first order
	order1, _ := service.FindByID(ctx, orderIDs[0])
	bot1 := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// Take order from pending queue
	_, err = repository.GetOrderRepository().TakePending(ctx, order1.Priority)
	if err != nil {
		t.Fatalf("Failed to take pending order: %v", err)
	}

	// Change order status to processing
	err = service.ChangeStatusToProcessing(ctx, order1, bot1)
	if err != nil {
		t.Fatalf("Failed to change order status to processing: %v", err)
	}

	// Change order status to completed
	err = service.ChangeStatusToCompleted(ctx, order1)
	if err != nil {
		t.Fatalf("Failed to change order status to completed: %v", err)
	}

	// Process the second order but reset it
	order2, _ := service.FindByID(ctx, orderIDs[1])
	bot2 := &models.Bot{
		ID:     2,
		Status: consts.BotStatusIdle,
	}

	// Take order from pending queue
	_, err = repository.GetOrderRepository().TakePending(ctx, order2.Priority)
	if err != nil {
		t.Fatalf("Failed to take pending order: %v", err)
	}

	// Change order status to processing
	err = service.ChangeStatusToProcessing(ctx, order2, bot2)
	if err != nil {
		t.Fatalf("Failed to change order status to processing: %v", err)
	}

	// Reset order
	err = service.ResetOrder(ctx, order2)
	if err != nil {
		t.Fatalf("Failed to reset order: %v", err)
	}

	// Find uncompleted orders again
	uncompleted, err = service.FindUncompleted(ctx)
	if err != nil {
		t.Fatalf("Failed to find uncompleted orders: %v", err)
	}
	if len(uncompleted) != 2 {
		t.Errorf("Expected 2 uncompleted orders, got %d", len(uncompleted))
	}

	// Find completed orders
	completed, err := service.FindRecentCompleted(ctx, 10)
	if err != nil {
		t.Fatalf("Failed to find completed orders: %v", err)
	}
	if len(completed) != 1 {
		t.Errorf("Expected 1 completed order, got %d", len(completed))
	}
	if completed[0].ID != orderIDs[0] {
		t.Errorf("Expected completed order ID to be %d, got %d", orderIDs[0], completed[0].ID)
	}
}
