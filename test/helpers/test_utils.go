package helpers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
	"mcmocknald-order-kiosk/internal/service"
)

// OrderStats tracks order statistics during testing
type OrderStats struct {
	Completed  int
	Incomplete int
	QueueSize  int
}

// CreateCustomers creates a batch of customers with the specified role
func CreateCustomers(ctx context.Context, t *testing.T, userRepo domain.UserRepository, count int, role domain.RoleType) []*domain.User {
	customers := make([]*domain.User, 0, count)
	for i := 0; i < count; i++ {
		customer := &domain.User{
			Name: fmt.Sprintf("%s %d", role, i+1),
			Role: role,
		}
		created, err := userRepo.Create(ctx, customer)
		if err != nil {
			t.Fatalf("Failed to create customer: %v", err)
		}
		customers = append(customers, created)
	}
	return customers
}

// CreateCooks creates a batch of cook bot users
func CreateCooks(ctx context.Context, t *testing.T, userRepo domain.UserRepository, count int) []*domain.User {
	cooks := make([]*domain.User, 0, count)
	for i := 0; i < count; i++ {
		cook := &domain.User{
			Name: fmt.Sprintf("Cook Bot %d", i+1),
			Role: domain.RoleCook,
		}
		created, err := userRepo.Create(ctx, cook)
		if err != nil {
			t.Fatalf("Failed to create cook: %v", err)
		}
		cooks = append(cooks, created)
	}
	return cooks
}

// CreateSampleFoods creates sample food items for testing
func CreateSampleFoods(ctx context.Context, t *testing.T, foodRepo domain.FoodRepository) []*domain.Food {
	foods := []*domain.Food{
		{Name: "Burger", Type: domain.FoodTypeFood},
		{Name: "Fries", Type: domain.FoodTypeFood},
		{Name: "Soda", Type: domain.FoodTypeDrink},
	}

	created := make([]*domain.Food, 0, len(foods))
	for _, food := range foods {
		f, err := foodRepo.Create(ctx, food)
		if err != nil {
			t.Fatalf("Failed to create food: %v", err)
		}
		created = append(created, f)
	}
	return created
}

// StartCookWorker simulates a cook worker processing orders for a specified duration
func StartCookWorker(ctx context.Context, cookService service.CookService, cookID int, duration time.Duration) {
	deadline := time.Now().Add(duration)
	for time.Now().Before(deadline) {
		_, err := cookService.AcceptOrder(ctx, cookID)
		if err != nil {
			// If no orders available, wait a bit
			time.Sleep(100 * time.Millisecond)
		}
	}
}
