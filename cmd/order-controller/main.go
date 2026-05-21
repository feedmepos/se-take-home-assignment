package main

import (
	"flag"
	"fmt"
	"se-take-home-assignment/common"
	"se-take-home-assignment/internal/cli"
	"se-take-home-assignment/internal/sim"

	"github.com/rs/zerolog/log"
)

func main() {
	simMode := flag.Bool("sim", false, "Run in simulation mode")
	flag.Parse()

	if *simMode {
		runSimulation()
		return
	}

	common.InitLogging()
	r := cli.New()
	r.Run()
}

func runSimulation() {
	common.InitLogging()
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()
	log.Info().Msgf("System initialized with 0 bots")
	c := sim.NewController(1001)

	c.CreateNormalOrder() // Order #1001
	c.CreateVIPOrder()    // Order #1002
	c.CreateNormalOrder() // Order #1003

	c.AddBot() // Bot #1 picks up VIP #1002
	c.AddBot() // Bot #2 picks up Normal #1001

	for range 11 {
		c.Tick()
	}

	c.CreateVIPOrder() // Order #1004

	for range 14 {
		c.Tick()
	}

	c.RemoveBot()

	completed := c.CompleteOrder()
	vipCount := 0
	for _, o := range completed {
		if o.IsVIP {
			vipCount++
		}
	}
	normalCount := len(completed) - vipCount

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", len(completed), vipCount, normalCount)
	fmt.Printf("- Orders Completed: %d\n", len(completed))
	fmt.Printf("- Active Bots: %d\n", len(c.Bots()))
	fmt.Printf("- Pending Orders: %d\n", len(c.PendingOrders()))
}
