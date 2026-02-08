package main

import (
	"fmt"
	"os"
	"se-take-home-assignment/internal/controller"
	"se-take-home-assignment/internal/logger"
)

func main() {
	log := logger.New()
	ctrl := controller.NewOrderController(log)

	// Simulate the order management system
	// This demonstrates all the requirements

	// Create some orders
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()

	// Add bots to process orders
	ctrl.AddBot()
	ctrl.AddBot()

	// Wait for some processing
	ctrl.Wait(12 * 1000) // 12 seconds

	// Create another VIP order while processing
	ctrl.CreateVIPOrder()
	ctrl.Wait(12 * 1000) // Wait for completion

	// Remove a bot
	ctrl.RemoveBot()

	// Final wait
	ctrl.Wait(1 * 1000)

	// Output final status
	ctrl.PrintStatus()

	// Write output to result.txt
	output := log.GetOutput()
	err := os.WriteFile("scripts/result.txt", []byte(output), 0644)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error writing result.txt: %v\n", err)
		os.Exit(1)
	}
}

