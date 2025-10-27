package service

import (
	"context"
	"fmt"

	"mcmocknald-order-kiosk/internal/domain"
	"mcmocknald-order-kiosk/internal/logger"
)

// FoodService defines the interface for food operations
// Following Interface Segregation Principle: focused interface for food-related business logic
type FoodService interface {
	// GetAllFoods retrieves all non-deleted food items
	// Time Complexity: O(n) where n is the number of food items
	GetAllFoods(ctx context.Context) ([]*domain.Food, error)

	// GetFoodByID retrieves a specific food item by ID
	// Time Complexity: O(1) for in-memory with map, O(log n) for database with index
	GetFoodByID(ctx context.Context, id int) (*domain.Food, error)

	// GetFoodsByType retrieves all non-deleted food items filtered by type
	// Time Complexity: O(n) where n is the number of food items
	GetFoodsByType(ctx context.Context, foodType domain.FoodType) ([]*domain.Food, error)
}

// foodService implements food business logic
// Following Single Responsibility Principle: manages food display operations
// Following Dependency Inversion Principle: depends on abstractions (interfaces)
type foodService struct {
	foodRepo domain.FoodRepository
	logger   logger.Logger
}

// NewFoodService creates a new food service with dependency injection
// Following Dependency Injection pattern: all dependencies passed via constructor
func NewFoodService(
	foodRepo domain.FoodRepository,
	log logger.Logger,
) FoodService {
	return &foodService{
		foodRepo: foodRepo,
		logger:   log,
	}
}

// GetAllFoods retrieves all non-deleted food items
// Business Logic: Only returns active (non-deleted) food items suitable for ordering
// Time Complexity: O(n) where n is the number of food items
func (s *foodService) GetAllFoods(ctx context.Context) ([]*domain.Food, error) {
	foods, err := s.foodRepo.GetAll(ctx)
	if err != nil {
		s.logger.Error("Failed to retrieve all foods: %v", err)
		return nil, fmt.Errorf("failed to retrieve foods: %w", err)
	}

	s.logger.Info("Retrieved %d food items", len(foods))
	return foods, nil
}

// GetFoodByID retrieves a specific food item by ID
// Business Logic: Returns the food item if it exists; checks for soft deletion
// Time Complexity: O(1) for in-memory with map, O(log n) for database with index
func (s *foodService) GetFoodByID(ctx context.Context, id int) (*domain.Food, error) {
	food, err := s.foodRepo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to retrieve food with ID %d: %v", id, err)
		return nil, fmt.Errorf("food not found: %w", err)
	}

	// Business rule: Do not return soft-deleted items to customers
	if food.IsDeleted() {
		s.logger.Error("Attempted to retrieve deleted food: ID %d", id)
		return nil, fmt.Errorf("food item is no longer available")
	}

	s.logger.Info("Retrieved food: %s (ID: %d, Type: %s)", food.Name, food.ID, food.Type)
	return food, nil
}

// GetFoodsByType retrieves all non-deleted food items filtered by type
// Business Logic: Filters items by type (Food, Drink, Dessert) for category browsing
// Time Complexity: O(n) where n is the number of food items
func (s *foodService) GetFoodsByType(ctx context.Context, foodType domain.FoodType) ([]*domain.Food, error) {
	// Validate food type
	if !isValidFoodType(foodType) {
		s.logger.Error("Invalid food type requested: %s", foodType)
		return nil, fmt.Errorf("invalid food type: %s", foodType)
	}

	foods, err := s.foodRepo.GetByType(ctx, foodType)
	if err != nil {
		s.logger.Error("Failed to retrieve foods by type %s: %v", foodType, err)
		return nil, fmt.Errorf("failed to retrieve foods by type: %w", err)
	}

	s.logger.Info("Retrieved %d food items of type %s", len(foods), foodType)
	return foods, nil
}

// isValidFoodType validates that the provided food type is one of the allowed values
// Time Complexity: O(1) - constant time comparison
func isValidFoodType(foodType domain.FoodType) bool {
	switch foodType {
	case domain.FoodTypeFood, domain.FoodTypeDrink, domain.FoodTypeDessert:
		return true
	default:
		return false
	}
}
