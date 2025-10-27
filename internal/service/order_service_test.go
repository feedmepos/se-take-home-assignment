package service

import (
	"context"
	"testing"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
	"mcmocknald-order-kiosk/internal/infrastructure/memory"
	"mcmocknald-order-kiosk/internal/logger"
	"mcmocknald-order-kiosk/pkg/queue"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupOrderServiceTest creates a test environment for order service tests
func setupOrderServiceTest(t *testing.T) (OrderService, domain.UserRepository, domain.FoodRepository, domain.OrderRepository, queue.OrderQueue) {
	ctx := context.Background()
	log := logger.NewNoOpLogger()

	userRepo := memory.NewUserRepository()
	foodRepo := memory.NewFoodRepository()
	orderRepo := memory.NewOrderRepository(userRepo, foodRepo)
	orderQueue := queue.NewPriorityQueue()

	orderService := NewOrderService(orderRepo, userRepo, foodRepo, orderQueue, log, 10*time.Second)

	// Create sample food items for tests
	foodRepo.Create(ctx, &domain.Food{Name: "Burger", Type: domain.FoodTypeFood})
	foodRepo.Create(ctx, &domain.Food{Name: "Fries", Type: domain.FoodTypeFood})
	foodRepo.Create(ctx, &domain.Food{Name: "Soda", Type: domain.FoodTypeDrink})

	return orderService, userRepo, foodRepo, orderRepo, orderQueue
}

// TestCreateOrderWithRegularCustomer tests creating an order with a regular customer
func TestCreateOrderWithRegularCustomer(t *testing.T) {
	ctx := context.Background()
	orderService, userRepo, _, _, orderQueue := setupOrderServiceTest(t)

	// Create a regular customer
	customer, err := userRepo.Create(ctx, &domain.User{
		Name: "John Doe",
		Role: domain.RoleRegularCustomer,
	})
	require.NoError(t, err)

	// Create an order
	order, err := orderService.CreateOrder(ctx, customer.ID, []int{1})

	require.NoError(t, err, "Should create order successfully")
	assert.NotNil(t, order, "Order should not be nil")
	assert.Equal(t, customer.ID, order.OrderedBy, "Order should be created by the customer")
	assert.Equal(t, domain.OrderStatusPending, order.Status, "Order status should be PENDING")
	assert.Equal(t, 1, orderQueue.Size(), "Order should be added to queue")
}

// TestCreateOrderWithVIPCustomer tests creating an order with a VIP customer
func TestCreateOrderWithVIPCustomer(t *testing.T) {
	ctx := context.Background()
	orderService, userRepo, _, _, orderQueue := setupOrderServiceTest(t)

	// Create a VIP customer
	customer, err := userRepo.Create(ctx, &domain.User{
		Name: "Jane Smith",
		Role: domain.RoleVIPCustomer,
	})
	require.NoError(t, err)

	// Create an order
	order, err := orderService.CreateOrder(ctx, customer.ID, []int{1, 2})

	require.NoError(t, err, "Should create order successfully")
	assert.NotNil(t, order, "Order should not be nil")
	assert.Equal(t, customer.ID, order.OrderedBy, "Order should be created by the VIP customer")
	assert.Equal(t, domain.RoleVIPCustomer, order.CustomerRole, "Order should have VIP customer role")
	assert.Equal(t, 1, orderQueue.Size(), "Order should be added to queue")
}

// TestCreateOrderWithNonExistentCustomer tests creating an order with a customer that doesn't exist
func TestCreateOrderWithNonExistentCustomer(t *testing.T) {
	ctx := context.Background()
	orderService, _, _, _, orderQueue := setupOrderServiceTest(t)

	// Try to create an order with non-existent customer
	order, err := orderService.CreateOrder(ctx, 999, []int{1})

	assert.Error(t, err, "Should return error for non-existent customer")
	assert.Nil(t, order, "Order should be nil")
	assert.Equal(t, 0, orderQueue.Size(), "Order should not be added to queue")
}

// TestCreateOrderWithDeletedCustomer tests creating an order with a deleted customer
func TestCreateOrderWithDeletedCustomer(t *testing.T) {
	ctx := context.Background()
	orderService, userRepo, _, _, orderQueue := setupOrderServiceTest(t)

	// Create and delete a customer
	customer, err := userRepo.Create(ctx, &domain.User{
		Name: "Deleted User",
		Role: domain.RoleRegularCustomer,
	})
	require.NoError(t, err)

	err = userRepo.SoftDelete(ctx, customer.ID)
	require.NoError(t, err)

	// Try to create an order with deleted customer
	order, err := orderService.CreateOrder(ctx, customer.ID, []int{1})

	assert.Error(t, err, "Should return error for deleted customer")
	assert.Nil(t, order, "Order should be nil")
	assert.Contains(t, err.Error(), "deleted", "Error should mention customer is deleted")
	assert.Equal(t, 0, orderQueue.Size(), "Order should not be added to queue")
}

// TestCreateOrderWithCook tests that a cook cannot create an order
func TestCreateOrderWithCook(t *testing.T) {
	ctx := context.Background()
	orderService, userRepo, _, _, orderQueue := setupOrderServiceTest(t)

	// Create a cook user
	cook, err := userRepo.Create(ctx, &domain.User{
		Name: "Cook Bob",
		Role: domain.RoleCook,
	})
	require.NoError(t, err)

	// Try to create an order with a cook
	order, err := orderService.CreateOrder(ctx, cook.ID, []int{1})

	assert.Error(t, err, "Should return error when cook tries to create order")
	assert.Nil(t, order, "Order should be nil")
	assert.Contains(t, err.Error(), "not a customer", "Error should mention user is not a customer")
	assert.Equal(t, 0, orderQueue.Size(), "Order should not be added to queue")
}

// TestCreateOrderWithEmptyFoodList tests creating an order with empty food list
func TestCreateOrderWithEmptyFoodList(t *testing.T) {
	ctx := context.Background()
	orderService, userRepo, _, _, _ := setupOrderServiceTest(t)

	// Create a customer
	customer, err := userRepo.Create(ctx, &domain.User{
		Name: "John Doe",
		Role: domain.RoleRegularCustomer,
	})
	require.NoError(t, err)

	// Try to create an order with empty food list
	order, err := orderService.CreateOrder(ctx, customer.ID, []int{})

	// The behavior depends on the repository implementation
	// For this test, we just verify it doesn't panic
	_ = order
	_ = err
}

// TestGetOrder tests retrieving an order by ID
func TestGetOrder(t *testing.T) {
	ctx := context.Background()
	orderService, userRepo, _, _, _ := setupOrderServiceTest(t)

	// Create a customer and order
	customer, err := userRepo.Create(ctx, &domain.User{
		Name: "John Doe",
		Role: domain.RoleRegularCustomer,
	})
	require.NoError(t, err)

	createdOrder, err := orderService.CreateOrder(ctx, customer.ID, []int{1})
	require.NoError(t, err)

	// Retrieve the order
	retrievedOrder, err := orderService.GetOrder(ctx, createdOrder.ID)

	require.NoError(t, err, "Should retrieve order successfully")
	assert.NotNil(t, retrievedOrder, "Retrieved order should not be nil")
	assert.Equal(t, createdOrder.ID, retrievedOrder.ID, "Order IDs should match")
	assert.Equal(t, createdOrder.OrderedBy, retrievedOrder.OrderedBy, "Order customer should match")
}

// TestGetOrderNonExistent tests retrieving a non-existent order
func TestGetOrderNonExistent(t *testing.T) {
	ctx := context.Background()
	orderService, _, _, _, _ := setupOrderServiceTest(t)

	// Try to retrieve non-existent order
	order, err := orderService.GetOrder(ctx, 999)

	assert.Error(t, err, "Should return error for non-existent order")
	assert.Nil(t, order, "Order should be nil")
}

// TestGetOrderStats tests retrieving order statistics
func TestGetOrderStats(t *testing.T) {
	ctx := context.Background()
	orderService, userRepo, _, _, _ := setupOrderServiceTest(t)

	// Initially, stats should be zero
	completed, incomplete, err := orderService.GetOrderStats(ctx)
	require.NoError(t, err)
	assert.Equal(t, 0, completed, "Should have no completed orders initially")
	assert.Equal(t, 0, incomplete, "Should have no incomplete orders initially")

	// Create a customer and order
	customer, err := userRepo.Create(ctx, &domain.User{
		Name: "John Doe",
		Role: domain.RoleRegularCustomer,
	})
	require.NoError(t, err)

	_, err = orderService.CreateOrder(ctx, customer.ID, []int{1})
	require.NoError(t, err)

	// Stats should now show 1 incomplete order
	completed, incomplete, err = orderService.GetOrderStats(ctx)
	require.NoError(t, err)
	assert.Equal(t, 0, completed, "Should have no completed orders")
	assert.Equal(t, 1, incomplete, "Should have 1 incomplete order")
}

// TestGetQueueSize tests retrieving the queue size
func TestGetQueueSize(t *testing.T) {
	ctx := context.Background()
	orderService, userRepo, _, _, _ := setupOrderServiceTest(t)

	// Initially, queue should be empty
	assert.Equal(t, 0, orderService.GetQueueSize(), "Queue should be empty initially")

	// Create a customer and order
	customer, err := userRepo.Create(ctx, &domain.User{
		Name: "John Doe",
		Role: domain.RoleRegularCustomer,
	})
	require.NoError(t, err)

	_, err = orderService.CreateOrder(ctx, customer.ID, []int{1})
	require.NoError(t, err)

	// Queue size should now be 1
	assert.Equal(t, 1, orderService.GetQueueSize(), "Queue should have 1 order")
}

// TestMultipleOrders tests creating multiple orders
func TestMultipleOrders(t *testing.T) {
	ctx := context.Background()
	orderService, userRepo, _, _, orderQueue := setupOrderServiceTest(t)

	// Create customers
	customer1, err := userRepo.Create(ctx, &domain.User{
		Name: "Customer 1",
		Role: domain.RoleRegularCustomer,
	})
	require.NoError(t, err)

	customer2, err := userRepo.Create(ctx, &domain.User{
		Name: "Customer 2",
		Role: domain.RoleVIPCustomer,
	})
	require.NoError(t, err)

	// Create multiple orders
	_, err = orderService.CreateOrder(ctx, customer1.ID, []int{1})
	require.NoError(t, err)

	_, err = orderService.CreateOrder(ctx, customer2.ID, []int{2})
	require.NoError(t, err)

	_, err = orderService.CreateOrder(ctx, customer1.ID, []int{3})
	require.NoError(t, err)

	// Verify queue size and stats
	assert.Equal(t, 3, orderService.GetQueueSize(), "Queue should have 3 orders")

	completed, incomplete, err := orderService.GetOrderStats(ctx)
	require.NoError(t, err)
	assert.Equal(t, 0, completed, "Should have no completed orders")
	assert.Equal(t, 3, incomplete, "Should have 3 incomplete orders")

	// VIP order should be at the front of the queue
	peekedOrder, err := orderQueue.Peek()
	require.NoError(t, err)
	assert.Equal(t, domain.RoleVIPCustomer, peekedOrder.CustomerRole, "VIP order should be first in queue")
}
