package memory

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
)

// OrderRepository implements in-memory order repository
// Following Repository Pattern: abstracts data access
// Time Complexity: Most operations are O(1) due to map usage
type OrderRepository struct {
	orders     map[int]*domain.Order // Map for O(1) lookup by ID
	orderFoods map[int][]int         // Map of order ID to food IDs
	mu         sync.RWMutex          // Protects concurrent access
	nextID     int                   // Auto-increment ID
	userRepo   domain.UserRepository // Dependency injection for user data
	foodRepo   domain.FoodRepository // Dependency injection for food data
}

// NewOrderRepository creates a new in-memory order repository
func NewOrderRepository(userRepo domain.UserRepository, foodRepo domain.FoodRepository) *OrderRepository {
	return &OrderRepository{
		orders:     make(map[int]*domain.Order),
		orderFoods: make(map[int][]int),
		nextID:     1,
		userRepo:   userRepo,
		foodRepo:   foodRepo,
	}
}

// Create creates a new order
// Time Complexity: O(1) - map insertion
func (r *OrderRepository) Create(ctx context.Context, order *domain.Order, foodIDs []int) (*domain.Order, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	order.ID = r.nextID
	r.nextID++
	order.CreatedAt = time.Now()
	order.ModifiedAt = time.Now()

	// Default status is PENDING
	if order.Status == "" {
		order.Status = domain.OrderStatusPending
	}

	r.orders[order.ID] = order
	if len(foodIDs) > 0 {
		r.orderFoods[order.ID] = foodIDs
	}

	return order, nil
}

// GetByID retrieves an order by ID with enriched data
// Time Complexity: O(1) for order lookup + O(n) for foods where n is number of foods per order
func (r *OrderRepository) GetByID(ctx context.Context, id int) (*domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	order, exists := r.orders[id]
	if !exists {
		return nil, fmt.Errorf("order not found: %d", id)
	}

	// Enrich with customer data
	if customer, err := r.userRepo.GetByID(ctx, order.OrderedBy); err == nil {
		order.CustomerName = customer.Name
		order.CustomerRole = customer.Role
	}

	// Enrich with cook data
	if order.AssignedCookUser != nil {
		if cook, err := r.userRepo.GetByID(ctx, *order.AssignedCookUser); err == nil {
			order.CookName = cook.Name
		}
	}

	// Enrich with food data
	if foodIDs, exists := r.orderFoods[id]; exists {
		foods := make([]domain.Food, 0, len(foodIDs))
		for _, foodID := range foodIDs {
			if food, err := r.foodRepo.GetByID(ctx, foodID); err == nil {
				foods = append(foods, *food)
			}
		}
		order.Foods = foods
	}

	return order, nil
}

// GetByStatus retrieves all orders with a specific status
// Time Complexity: O(n) - must scan all orders
func (r *OrderRepository) GetByStatus(ctx context.Context, status domain.OrderStatus) ([]*domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.Order
	for _, order := range r.orders {
		if order.Status == status && order.DeletedAt == nil {
			result = append(result, order)
		}
	}

	return result, nil
}

// GetByCustomerID retrieves all orders for a customer
// Time Complexity: O(n) - must scan all orders
func (r *OrderRepository) GetByCustomerID(ctx context.Context, customerID int) ([]*domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.Order
	for _, order := range r.orders {
		if order.OrderedBy == customerID && order.DeletedAt == nil {
			result = append(result, order)
		}
	}

	return result, nil
}

// GetByCookID retrieves all orders assigned to a cook
// Time Complexity: O(n) - must scan all orders
func (r *OrderRepository) GetByCookID(ctx context.Context, cookID int) ([]*domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.Order
	for _, order := range r.orders {
		if order.AssignedCookUser != nil && *order.AssignedCookUser == cookID {
			result = append(result, order)
		}
	}

	return result, nil
}

// Update updates an existing order
// Time Complexity: O(1) - map lookup and update
func (r *OrderRepository) Update(ctx context.Context, order *domain.Order) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.orders[order.ID]; !exists {
		return fmt.Errorf("order not found: %d", order.ID)
	}

	order.ModifiedAt = time.Now()
	r.orders[order.ID] = order
	return nil
}

// AssignCook assigns a cook to an order
// Time Complexity: O(1) - map lookup and update
func (r *OrderRepository) AssignCook(ctx context.Context, orderID, cookID int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	order, exists := r.orders[orderID]
	if !exists {
		return fmt.Errorf("order not found: %d", orderID)
	}

	order.AssignedCookUser = &cookID
	order.ModifiedAt = time.Now()
	return nil
}

// UnassignCook removes cook assignment from an order
// Time Complexity: O(1) - map lookup and update
func (r *OrderRepository) UnassignCook(ctx context.Context, orderID int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	order, exists := r.orders[orderID]
	if !exists {
		return fmt.Errorf("order not found: %d", orderID)
	}

	order.AssignedCookUser = nil
	order.ModifiedAt = time.Now()
	return nil
}

// UpdateStatus updates the status of an order
// Time Complexity: O(1) - map lookup and update
func (r *OrderRepository) UpdateStatus(ctx context.Context, orderID int, status domain.OrderStatus) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	order, exists := r.orders[orderID]
	if !exists {
		return fmt.Errorf("order not found: %d", orderID)
	}

	order.Status = status
	order.ModifiedAt = time.Now()
	return nil
}

// GetPendingOrders retrieves all pending orders
// Time Complexity: O(n) - must scan all orders
func (r *OrderRepository) GetPendingOrders(ctx context.Context) ([]*domain.Order, error) {
	return r.GetByStatus(ctx, domain.OrderStatusPending)
}

// GetStats retrieves order statistics
// Time Complexity: O(n) - must scan all orders
func (r *OrderRepository) GetStats(ctx context.Context) (completed, incomplete int, err error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, order := range r.orders {
		if order.DeletedAt != nil {
			continue
		}

		if order.Status == domain.OrderStatusComplete {
			completed++
		} else {
			incomplete++
		}
	}

	return completed, incomplete, nil
}
