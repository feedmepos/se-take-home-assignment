package service

import (
	"context"
	"fmt"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
	"mcmocknald-order-kiosk/internal/logger"
	"mcmocknald-order-kiosk/pkg/queue"
)

// OrderService defines the interface for order operations
// Following Interface Segregation Principle: focused interface
type OrderService interface {
	// CreateOrder creates a new order and adds it to the queue
	CreateOrder(ctx context.Context, customerID int, foodIDs []int) (*domain.Order, error)

	// GetOrder retrieves an order by ID
	GetOrder(ctx context.Context, orderID int) (*domain.Order, error)

	// GetOrderStats retrieves order statistics
	GetOrderStats(ctx context.Context) (completed, incomplete int, err error)

	// GetQueueSize returns the current queue size
	GetQueueSize() int
}

// orderService implements order business logic
// Following Single Responsibility Principle: manages order lifecycle
// Dependency Injection: all dependencies injected via constructor
type orderService struct {
	orderRepo       domain.OrderRepository
	userRepo        domain.UserRepository
	foodRepo        domain.FoodRepository
	orderQueue      queue.OrderQueue
	logger          logger.Logger
	servingDuration time.Duration
}

// NewOrderService creates a new order service
// Following Dependency Injection pattern
func NewOrderService(
	orderRepo domain.OrderRepository,
	userRepo domain.UserRepository,
	foodRepo domain.FoodRepository,
	orderQueue queue.OrderQueue,
	log logger.Logger,
	servingDuration time.Duration,
) OrderService {
	return &orderService{
		orderRepo:       orderRepo,
		userRepo:        userRepo,
		foodRepo:        foodRepo,
		orderQueue:      orderQueue,
		logger:          log,
		servingDuration: servingDuration,
	}
}

// CreateOrder creates a new order and adds it to the queue
// Time Complexity: O(1) for order creation + O(1) for queue enqueue = O(1)
func (s *orderService) CreateOrder(ctx context.Context, customerID int, foodIDs []int) (*domain.Order, error) {
	// Validate customer exists
	customer, err := s.userRepo.GetByID(ctx, customerID)
	if err != nil {
		s.logger.Error("Failed to get customer: %v", err)
		return nil, fmt.Errorf("customer not found: %w", err)
	}

	// Validate customer is not deleted
	if customer.IsDeleted() {
		s.logger.Error("Customer is deleted: %d", customerID)
		return nil, fmt.Errorf("customer is deleted")
	}

	// Validate customer is actually a customer (not a cook)
	if !customer.IsCustomer() {
		s.logger.Error("User is not a customer: %d (role: %s)", customerID, customer.Role)
		return nil, fmt.Errorf("user is not a customer")
	}

	// Validate food IDs
	if err := s.validateFoodIDs(ctx, foodIDs); err != nil {
		s.logger.Error("Food validation failed: %v", err)
		return nil, err
	}

	// Create order in repository
	order := &domain.Order{
		Status:    domain.OrderStatusPending,
		OrderedBy: customerID,
	}

	createdOrder, err := s.orderRepo.Create(ctx, order, foodIDs)
	if err != nil {
		s.logger.Error("Failed to create order: %v", err)
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	// Enrich order with customer data for queue
	createdOrder.CustomerName = customer.Name
	createdOrder.CustomerRole = customer.Role

	// Add to priority queue
	if err := s.orderQueue.Enqueue(createdOrder); err != nil {
		s.logger.Error("Failed to enqueue order %d: %v", createdOrder.ID, err)
		return nil, fmt.Errorf("failed to enqueue order: %w", err)
	}

	s.logger.Info("Order %d created by customer %s (%s) - Queue size: %d",
		createdOrder.ID, customer.Name, customer.Role, s.orderQueue.Size())

	return createdOrder, nil
}

// GetOrder retrieves an order by ID
// Time Complexity: O(1) for in-memory, O(log n) for database
func (s *orderService) GetOrder(ctx context.Context, orderID int) (*domain.Order, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		s.logger.Error("Failed to get order %d: %v", orderID, err)
		return nil, err
	}

	return order, nil
}

// GetOrderStats retrieves order statistics
// Time Complexity: O(n) - must scan all orders
func (s *orderService) GetOrderStats(ctx context.Context) (completed, incomplete int, err error) {
	completed, incomplete, err = s.orderRepo.GetStats(ctx)
	if err != nil {
		s.logger.Error("Failed to get order stats: %v", err)
		return 0, 0, err
	}

	return completed, incomplete, nil
}

// GetQueueSize returns the current queue size
// Time Complexity: O(1)
func (s *orderService) GetQueueSize() int {
	return s.orderQueue.Size()
}

// validateFoodIDs validates that all food IDs exist and are available
// Time Complexity: O(n) where n is number of food IDs
func (s *orderService) validateFoodIDs(ctx context.Context, foodIDs []int) error {
	if len(foodIDs) == 0 {
		return fmt.Errorf("order must contain at least one food item")
	}

	// Check for duplicates
	seen := make(map[int]bool)
	for _, id := range foodIDs {
		if seen[id] {
			return fmt.Errorf("duplicate food ID in order: %d", id)
		}
		seen[id] = true
	}

	// Validate each food ID exists and is not deleted
	for _, foodID := range foodIDs {
		food, err := s.foodRepo.GetByID(ctx, foodID)
		if err != nil {
			return fmt.Errorf("food item not found: %d", foodID)
		}
		if food.IsDeleted() {
			return fmt.Errorf("food item is no longer available: %s", food.Name)
		}
	}

	return nil
}
