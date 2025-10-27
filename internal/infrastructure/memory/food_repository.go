package memory

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
)

// FoodRepository implements in-memory food repository
// Following Repository Pattern: abstracts data access
// Time Complexity: Most operations are O(1) due to map usage
type FoodRepository struct {
	foods  map[int]*domain.Food // Map for O(1) lookup by ID
	mu     sync.RWMutex         // Protects concurrent access
	nextID int                  // Auto-increment ID
}

// NewFoodRepository creates a new in-memory food repository
func NewFoodRepository() *FoodRepository {
	return &FoodRepository{
		foods:  make(map[int]*domain.Food),
		nextID: 1,
	}
}

// Create creates a new food item
// Time Complexity: O(1) - map insertion
func (r *FoodRepository) Create(ctx context.Context, food *domain.Food) (*domain.Food, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	food.ID = r.nextID
	r.nextID++
	food.CreatedAt = time.Now()
	food.ModifiedAt = time.Now()

	r.foods[food.ID] = food
	return food, nil
}

// GetByID retrieves a food item by ID
// Time Complexity: O(1) - map lookup
func (r *FoodRepository) GetByID(ctx context.Context, id int) (*domain.Food, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	food, exists := r.foods[id]
	if !exists {
		return nil, fmt.Errorf("food not found: %d", id)
	}

	return food, nil
}

// GetAll retrieves all non-deleted food items
// Time Complexity: O(n) - must iterate through all foods to filter deleted items
func (r *FoodRepository) GetAll(ctx context.Context) ([]*domain.Food, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*domain.Food, 0, len(r.foods))
	for _, food := range r.foods {
		if food.DeletedAt == nil {
			result = append(result, food)
		}
	}

	return result, nil
}

// GetByType retrieves all non-deleted food items filtered by type
// Time Complexity: O(n) - must iterate through all foods to filter by type and deleted status
func (r *FoodRepository) GetByType(ctx context.Context, foodType domain.FoodType) ([]*domain.Food, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*domain.Food, 0)
	for _, food := range r.foods {
		if food.DeletedAt == nil && food.Type == foodType {
			result = append(result, food)
		}
	}

	return result, nil
}

// GetByOrderID retrieves all food items for an order
// Note: This is handled by OrderRepository in memory mode
// Time Complexity: O(1) - not implemented here, delegated to OrderRepository
func (r *FoodRepository) GetByOrderID(ctx context.Context, orderID int) ([]*domain.Food, error) {
	// In memory mode, this is handled by the OrderRepository
	return []*domain.Food{}, nil
}
