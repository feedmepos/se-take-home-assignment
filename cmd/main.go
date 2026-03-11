package main

import (
	"fmt"
	"mcdonalds-order-system/internal/controller"
	"time"
)

func main() {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()

	ctrl := controller.NewController()

	// Log initial state
	log("System initialized with 0 bots")

	// Simulation scenario (similar to result.txt example)
	// Step 1: Create some orders
	ctrl.AddNormalOrder() // Order #1001
	time.Sleep(100 * time.Millisecond)

	ctrl.AddVIPOrder() // Order #1002
	time.Sleep(100 * time.Millisecond)

	ctrl.AddNormalOrder() // Order #1003
	time.Sleep(100 * time.Millisecond)

	// Step 2: Add first bot - it should pick up VIP order first
	ctrl.AddBot() // Bot #1
	time.Sleep(100 * time.Millisecond)

	// Step 3: Add second bot - it should pick up Normal Order #1001
	ctrl.AddBot() // Bot #2
	time.Sleep(100 * time.Millisecond)

	// Wait for orders to complete (10 seconds each)
	time.Sleep(10 * time.Second)
	time.Sleep(500 * time.Millisecond)

	// Step 4: Add another VIP order
	ctrl.AddVIPOrder() // Order #1004
	time.Sleep(100 * time.Millisecond)

	// Wait for remaining orders to complete
	time.Sleep(10 * time.Second)
	time.Sleep(500 * time.Millisecond)

	// Step 5: Remove a bot
	ctrl.RemoveBot()
	time.Sleep(100 * time.Millisecond)

	// Final status
	time.Sleep(500 * time.Millisecond)
	printFinalStatus(ctrl)
}

func log(format string, args ...interface{}) {
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("[%s] %s\n", timestamp, fmt.Sprintf(format, args...))
}

func printFinalStatus(ctrl *controller.Controller) {
	total, completed, pending, bots, vip, normal := ctrl.GetStats()

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", total, vip, normal)
	fmt.Printf("- Orders Completed: %d\n", completed)
	fmt.Printf("- Active Bots: %d\n", bots)
	fmt.Printf("- Pending Orders: %d\n", pending)
}
