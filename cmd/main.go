package main

import (
	"mcd/pkg/controller"
	"mcd/pkg/util"
	"time"
)

var ctl *controller.Controller

func main() {
	ctl = controller.Init()

	simulate()
}

func simulate() {
	// Log system initialization
	util.Log("System initialized with 0 bots")

	// Requirement 1 & 2: Create orders
	ctl.AddNormalOrder()
	ctl.AddVIPOrder()
	ctl.AddNormalOrder()

	// Wait a moment
	time.Sleep(1 * time.Second)

	// Requirement 4 & 5: Add bots and process orders
	ctl.AddBot()
	time.Sleep(1 * time.Second)
	ctl.AddBot()

	// Wait for orders to complete (10+ seconds each)
	time.Sleep(12 * time.Second)

	ctl.AddVIPOrder()
	time.Sleep(1 * time.Second)

	// Wait for final processing
	time.Sleep(12 * time.Second)

	// Remove one bot to test idle state
	ctl.DelBot()
	time.Sleep(1 * time.Second)
	ctl.FinalStatus()
}
