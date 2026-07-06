package main

import (
	"fmt"
	"mcdonalds-order-controller/service"
	"os"
	"time"
)

func runSimulation(controller *service.OrderController) {
	controller.Log("Starting simulation...")

	// Requirement 1 & 2: Create orders (Normal and VIP priority test)
	controller.AddNormalOrder()
	controller.AddVIPOrder()
	controller.AddNormalOrder()
	controller.AddVIPOrder()
	time.Sleep(1 * time.Second)

	// Requirement 4 & 5: Add bots and process orders
	controller.AddBot()
	time.Sleep(1 * time.Second)
	controller.AddBot()
	time.Sleep(1 * time.Second)

	// Wait for all orders to complete (each order takes 10 seconds)
	time.Sleep(12 * time.Second)

	// Show status after all orders completed
	controller.LogStatus()
	time.Sleep(1 * time.Second)

	// Test bot removal while idle (remove one bot, keep one)
	controller.RemoveBot()
	time.Sleep(1 * time.Second)

	// Test creating new orders with remaining bot
	controller.AddNormalOrder()
	controller.AddVIPOrder()
	time.Sleep(1 * time.Second)

	// Wait for final orders to complete
	time.Sleep(12 * time.Second)

	// Show final status before cleanup
	controller.LogStatus()
	time.Sleep(1 * time.Second)

	// Clean up: remove remaining bots
	controller.RemoveBot()
	time.Sleep(1 * time.Second)

	controller.Log("Shutting down...")
}

func main() {
	controller, err := service.NewOrderController("scripts/result.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
	defer controller.Close()

	service.PrintHelp()

	runSimulation(controller)

	time.Sleep(2 * time.Second)
}
