//go:build scenario

package scenario

import (
	"context"
	"testing"
	"time"

	"mcmocknald-order-kiosk/internal/domain"
	"mcmocknald-order-kiosk/internal/infrastructure/memory"
	"mcmocknald-order-kiosk/internal/logger"
	"mcmocknald-order-kiosk/internal/service"
	"mcmocknald-order-kiosk/pkg/queue"
	"mcmocknald-order-kiosk/test/helpers"

	"github.com/stretchr/testify/assert"
)

// CI-specific test configuration constants
// These values are optimized for CI/CD environments where execution time is critical
// Configuration: Only 2 cycles of orders to minimize log output in GitHub Actions
const (
	ciSmallNumCycles       = 2                // CI: Only 2 cycles of orders (minimal, focused test)
	ciSmallReportInterval  = 15 * time.Second // CI: Report after each cycle completes
	ciSmallServingDuration = 10 * time.Second // Keep same as original (10s per order)
)

// TestSmallLoadCI tests the system with a minimal load for CI/CD verification
// This is optimized for fast feedback with minimal log output
// Runs only 2 cycles of orders: initial batch + 1 additional batch
// With 25 cook bots and 10s serving time, each cycle completes in ~10-12 seconds
func TestSmallLoadCI(t *testing.T) {
	const (
		numRegularCustomers = 10 // CI: Reduced from 100 to minimize logs
		numVIPCustomers     = 5  // CI: Reduced from 50 to minimize logs
		numCooks            = 5  // CI: Reduced from 25 (still enough to handle load)
	)

	ctx := context.Background()

	// Use file logger to capture detailed cook bot activity
	log, err := logger.NewFileLogger("./logs")
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	defer log.Close()

	log.Info("=== Starting Small Load CI Test ===")
	log.Info("Parameters: %d Regular, %d VIP customers, %d cooks, %d cycles", numRegularCustomers, numVIPCustomers, numCooks, ciSmallNumCycles)
	log.Info("CI Configuration: Cycles=%d, ServingDuration=%v", ciSmallNumCycles, ciSmallServingDuration)

	// Initialize repositories
	userRepo := memory.NewUserRepository()
	foodRepo := memory.NewFoodRepository()
	orderRepo := memory.NewOrderRepository(userRepo, foodRepo)

	// Create customers using helper functions
	regularCustomers := helpers.CreateCustomers(ctx, t, userRepo, numRegularCustomers, domain.RoleRegularCustomer)
	vipCustomers := helpers.CreateCustomers(ctx, t, userRepo, numVIPCustomers, domain.RoleVIPCustomer)

	// Create cook bots
	cooks := helpers.CreateCooks(ctx, t, userRepo, numCooks)

	// Create sample foods
	foods := helpers.CreateSampleFoods(ctx, t, foodRepo)

	// Initialize services
	orderQueue := queue.NewPriorityQueue()
	orderService := service.NewOrderService(orderRepo, userRepo, foodRepo, orderQueue, log, ciSmallServingDuration)
	cookService := service.NewCookService(userRepo, orderRepo, orderQueue, log, ciSmallServingDuration)

	// Calculate test duration: enough time for 2 cycles
	// Each cycle takes ~servingDuration to complete
	testDuration := time.Duration(ciSmallNumCycles) * (ciSmallServingDuration + 2*time.Second)

	// Start cook workers
	for _, cook := range cooks {
		go helpers.StartCookWorker(ctx, cookService, cook.ID, testDuration)
	}

	allCustomers := append(regularCustomers, vipCustomers...)
	t.Logf("Starting CI test with %d total customers, %d cooks, %d cycles", len(allCustomers), numCooks, ciSmallNumCycles)

	// Run exactly ciSmallNumCycles cycles of orders
	for cycle := 1; cycle <= ciSmallNumCycles; cycle++ {
		t.Logf("\n=== Cycle %d/%d: Creating orders for %d customers ===", cycle, ciSmallNumCycles, len(allCustomers))

		// Create orders for all customers in this cycle
		for _, customer := range allCustomers {
			foodIDs := []int{foods[0].ID} // Simple: just one food item
			_, err := orderService.CreateOrder(ctx, customer.ID, foodIDs)
			if err != nil {
				t.Logf("Failed to create order for customer %d: %v", customer.ID, err)
			}
		}

		// Report status after creating orders
		completed, incomplete, _ := orderService.GetOrderStats(ctx)
		t.Logf("Cycle %d: Orders created. Queue size: %d, Completed: %d, Incomplete: %d",
			cycle, orderService.GetQueueSize(), completed, incomplete)

		// Wait for this cycle's orders to complete
		// Add extra time for queue processing
		if cycle < ciSmallNumCycles {
			time.Sleep(ciSmallServingDuration + 2*time.Second)
		}
	}

	// Wait for final cycle to complete
	t.Logf("\n=== Waiting for final orders to complete ===")
	time.Sleep(ciSmallServingDuration + 5*time.Second)

	// Final statistics
	completed, incomplete, _ := orderService.GetOrderStats(ctx)

	totalExpectedOrders := (numRegularCustomers + numVIPCustomers) * ciSmallNumCycles
	completionRate := float64(completed) / float64(totalExpectedOrders) * 100

	log.Info("=== Small Load CI Test Results ===")
	log.Info("Configuration: %d Regular, %d VIP customers, %d cooks, %d cycles", numRegularCustomers, numVIPCustomers, numCooks, ciSmallNumCycles)
	log.Info("Expected Total Orders: %d", totalExpectedOrders)
	log.Info("Final Completed: %d", completed)
	log.Info("Final Incomplete: %d", incomplete)
	log.Info("Completion Rate: %.2f%%", completionRate)

	t.Logf("\n=== Small Load CI Test Results ===")
	t.Logf("Configuration: %d Regular, %d VIP, %d cooks, %d cycles", numRegularCustomers, numVIPCustomers, numCooks, ciSmallNumCycles)
	t.Logf("Expected Total Orders: %d", totalExpectedOrders)
	t.Logf("Final Completed: %d", completed)
	t.Logf("Final Incomplete: %d", incomplete)
	t.Logf("Completion Rate: %.2f%%", completionRate)

	assert.Greater(t, completed, 0, "Should have completed some orders")
}
