package main

import (
	"fmt"
	"log"

	"order-controller/pkg/order"
	"order-controller/pkg/simulator"
)

func main() {
	// Create order management system
	orderManager := order.NewManager()
	
	// Create simulator to demonstrate the system
	sim := simulator.NewSimulator(orderManager)
	
	// Run the simulation
	if err := sim.Run(); err != nil {
		log.Fatalf("Simulation failed: %v", err)
	}
	
	// Print final results
	fmt.Println("\nFinal Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", 
		sim.GetTotalOrders(), sim.GetVIPOrders(), sim.GetNormalOrders())
	fmt.Printf("- Orders Completed: %d\n", sim.GetCompletedOrders())
	fmt.Printf("- Active Bots: %d\n", orderManager.GetActiveBotCount())
	fmt.Printf("- Pending Orders: %d\n", orderManager.GetPendingOrderCount())
}
