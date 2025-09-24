package main

import (
	"fmt"
	"order-controller/pkg/controller"
	"time"
)

func main() {
	fmt.Println("McDonald's Order Controller - Starting Simulation")
	fmt.Println("================================================")

	// Create the order controller
	orderCtrl := controller.NewOrderController()

	// Run simulation demonstrating all requirements
	runSimulation(orderCtrl)
}

func runSimulation(ctrl *controller.OrderController) {
	fmt.Println("\n=== Simulation Start ===")

	// Requirement 1: Create normal orders
	fmt.Println("\n1. Creating normal orders...")
	order1 := ctrl.CreateNormalOrder()
	fmt.Printf("   Created Normal Order: %s\n", order1.String())

	order2 := ctrl.CreateNormalOrder()
	fmt.Printf("   Created Normal Order: %s\n", order2.String())

	ctrl.PrintStatus()

	// Requirement 2: Create VIP orders (should be prioritized)
	fmt.Println("\n2. Creating VIP orders...")
	vipOrder1 := ctrl.CreateVIPOrder()
	fmt.Printf("   Created VIP Order: %s\n", vipOrder1.String())

	vipOrder2 := ctrl.CreateVIPOrder()
	fmt.Printf("   Created VIP Order: %s\n", vipOrder2.String())

	ctrl.PrintStatus()

	// Requirement 4 & 5: Add bots and process orders
	fmt.Println("\n3. Adding bots to process orders...")
	bot1 := ctrl.AddBot()
	fmt.Printf("   Added Bot: %s\n", bot1.String())

	// Wait a moment to see processing
	time.Sleep(1 * time.Second)
	ctrl.PrintStatus()

	// Add another bot
	bot2 := ctrl.AddBot()
	fmt.Printf("   Added Bot: %s\n", bot2.String())

	// Wait for orders to complete (10 seconds each)
	fmt.Println("\n4. Waiting for orders to complete...")
	time.Sleep(12 * time.Second)
	ctrl.PrintStatus()

	// Requirement 6: Remove bot while processing
	fmt.Println("\n5. Testing bot removal...")
	// Create another order first
	normalOrder := ctrl.CreateNormalOrder()
	fmt.Printf("   Created Normal Order: %s\n", normalOrder.String())

	time.Sleep(2 * time.Second) // Let bot start processing
	ctrl.PrintStatus()

	// Remove a bot
	removedBot := ctrl.RemoveBot()
	if removedBot != nil {
		fmt.Printf("   Removed Bot: %s\n", removedBot.String())
	}
	ctrl.PrintStatus()

	// Wait for remaining processing to complete
	time.Sleep(12 * time.Second)
	ctrl.PrintStatus()

	// Test idle state
	fmt.Println("\n6. Testing idle state (no pending orders)...")
	time.Sleep(2 * time.Second)
	ctrl.PrintStatus()

	// Add more orders to test queue behavior
	fmt.Println("\n7. Testing complex queue behavior...")
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.PrintStatus()

	fmt.Println("\n=== Simulation Complete ===")
	fmt.Printf("\nFinal Statistics:\n")
	fmt.Printf("- Total Orders Created: %d\n", ctrl.GetTotalOrdersCreated())
	fmt.Printf("- Current Pending Orders: %d\n", ctrl.GetPendingOrderCount())
	fmt.Printf("- Current Completed Orders: %d\n", ctrl.GetCompletedOrderCount())
	fmt.Printf("- Active Bots: %d\n", ctrl.GetActiveBotCount())
}
