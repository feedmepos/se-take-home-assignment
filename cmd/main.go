package main

import (
	"fmt"
	"order-controller/pkg/controller"
	"time"
)

func main() {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println("")

	// Create the order controller
	orderCtrl := controller.NewOrderController()

	// Run simulation demonstrating all requirements
	runSimulation(orderCtrl)
}

func runSimulation(ctrl *controller.OrderController) {
	// Log system initialization
	ctrl.LogWithTimestamp("System initialized with 0 bots")

	// Requirement 1 & 2: Create orders
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder() 
	ctrl.CreateNormalOrder()

	// Wait a moment
	time.Sleep(1 * time.Second)

	// Requirement 4 & 5: Add bots and process orders
	ctrl.AddBot()
	time.Sleep(1 * time.Second)
	ctrl.AddBot()

	// Wait for orders to complete (10+ seconds each)
	time.Sleep(12 * time.Second)

	// Test bot removal while processing
	ctrl.CreateVIPOrder()
	time.Sleep(1 * time.Second)

	// Wait for final processing
	time.Sleep(12 * time.Second)

	// Remove one bot to test idle state
	ctrl.RemoveBot()

	ctrl.PrintFinalStatus()
}
