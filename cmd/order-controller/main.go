package main

import (
	"fmt"
	"order-controller/internal/order"
	"time"
)

func main() {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println("")

	ctrl := order.NewController()
	runSimulation(ctrl)
}

func runSimulation(ctrl *order.Controller) {
	// Manager starts with 0 bots
	ctrl.LogWithTimestamp("System initialized with 0 bots")

	// Customers place orders
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()

	time.Sleep(1 * time.Second)

	// Manager adds bots
	ctrl.AddBot()
	time.Sleep(1 * time.Second)
	ctrl.AddBot()

	// Wait for first wave (10s processing)
	time.Sleep(12 * time.Second)

	// VIP arrives while bots are available
	ctrl.CreateVIPOrder()
	time.Sleep(1 * time.Second)

	time.Sleep(12 * time.Second)

	// Manager removes newest bot
	ctrl.RemoveBot()

	ctrl.PrintFinalStatus()
}
