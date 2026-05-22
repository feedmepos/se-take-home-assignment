package main

import (
	"fmt"
	"order-controller/pkg/controller"
	"time"
)

func main() {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println("=========================================================")
	fmt.Println("")

	// Create the order controller
	orderCtrl := controller.NewOrderController()

	// Run simulation demonstrating all requirements
	runSimulation(orderCtrl)
}

func runSimulation(ctrl *controller.OrderController) {
	// Log system initialization
	ctrl.LogWithTimestamp("System initialized with 0 bots")
	fmt.Println("")

	// ===== Scenario 1: Create orders and process with bots =====
	fmt.Println("--- Scenario 1: Normal Operations (Orders & Bot Processing) ---")
	
	// Requirement 1 & 2: Create orders
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()

	// Wait a moment
	time.Sleep(1 * time.Second)

	// Requirement 4 & 5: Add bots and process orders
	ctrl.AddBot()
	time.Sleep(500 * time.Millisecond)
	ctrl.AddBot()

	// Wait for orders to complete (10+ seconds each)
	time.Sleep(12 * time.Second)

	fmt.Println("")
	fmt.Println("--- Scenario 2: Bot Removal During Processing ---")

	// Test bot removal while processing
	ctrl.CreateVIPOrder()
	time.Sleep(1 * time.Second)

	// Wait for final processing
	time.Sleep(12 * time.Second)

	// Remove one bot to test idle state
	ctrl.RemoveBot()

	fmt.Println("")
	fmt.Println("--- Scenario 3: VIP Priority Verification ---")

	// Create a mix of orders to verify VIP priority
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()

	time.Sleep(1 * time.Second)

	// Add bot to process
	ctrl.AddBot()

	// Wait for processing
	time.Sleep(12 * time.Second)

	fmt.Println("")
	ctrl.PrintFinalStatus()
}
