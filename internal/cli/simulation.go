package cli

import (
	"fmt"
	"time"

	"github.com/dnisting/se-take-home-assignment/internal/controller"
	"github.com/dnisting/se-take-home-assignment/internal/models"
)

// RunSimulation executes the hardcoded simulation scenario.
func RunSimulation(logFunc models.LogFunc) {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()

	c := controller.New(logFunc)
	logFunc("Simulation mode started")

	// Create 3 orders: Normal, VIP, Normal
	c.NewNormalOrder() // #1001
	time.Sleep(1 * time.Second)
	c.NewVIPOrder()    // #1002
	c.NewNormalOrder() // #1003
	time.Sleep(1 * time.Second)

	// Add 2 bots — Bot #1 picks up VIP #1002, Bot #2 picks up Normal #1001
	c.AddBot()
	time.Sleep(1 * time.Second)
	c.AddBot()

	// Wait for processing to complete (~10 seconds)
	time.Sleep(11 * time.Second)

	// Create another VIP order — idle bot picks it up
	c.NewVIPOrder() // #1004
	time.Sleep(11 * time.Second)

	// Remove newest bot (Bot #2)
	c.RemoveBot()
	time.Sleep(1 * time.Second)

	// Get final status
	total, completed, activeBots, pending, vip, normal := c.GetStatus()

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", total, vip, normal)
	fmt.Printf("- Orders Completed: %d\n", completed)
	fmt.Printf("- Active Bots: %d\n", activeBots)
	fmt.Printf("- Pending Orders: %d\n", pending)

	c.Shutdown()
}
