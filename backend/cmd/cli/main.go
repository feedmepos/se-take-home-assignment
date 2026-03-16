package main

import (
	"fmt"
	"time"

	"github.com/feedme/order-controller/internal/core"
	"github.com/feedme/order-controller/internal/engine"
)

func ts() string {
	return time.Now().Format("15:04:05")
}

func main() {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()

	e := engine.New(10 * time.Second)

	fmt.Printf("[%s] System initialized with 0 bots\n", ts())

	// Add orders
	o1 := e.AddOrder(core.Normal)
	fmt.Printf("[%s] Created %s Order #%d - Status: %s\n", ts(), o1.Type, o1.ID, o1.Status)

	time.Sleep(1 * time.Second)

	o2 := e.AddOrder(core.VIP)
	fmt.Printf("[%s] Created %s Order #%d - Status: %s\n", ts(), o2.Type, o2.ID, o2.Status)

	o3 := e.AddOrder(core.Normal)
	fmt.Printf("[%s] Created %s Order #%d - Status: %s\n", ts(), o3.Type, o3.ID, o3.Status)

	time.Sleep(1 * time.Second)

	// Add Bot #1 — should pick up VIP #2
	b1 := e.AddBot()
	fmt.Printf("[%s] Bot #%d created - Status: ACTIVE\n", ts(), b1.ID)
	time.Sleep(100 * time.Millisecond) // let bot pick up
	state := e.State()
	for _, bot := range state.Bots {
		if bot.Order != nil {
			fmt.Printf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING\n", ts(), bot.ID, bot.Order.Type, bot.Order.ID)
		}
	}

	time.Sleep(1 * time.Second)

	// Add Bot #2 — should pick up Normal #1
	b2 := e.AddBot()
	fmt.Printf("[%s] Bot #%d created - Status: ACTIVE\n", ts(), b2.ID)
	time.Sleep(100 * time.Millisecond)
	state = e.State()
	for _, bot := range state.Bots {
		if bot.ID == b2.ID && bot.Order != nil {
			fmt.Printf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING\n", ts(), bot.ID, bot.Order.Type, bot.Order.ID)
		}
	}

	// Wait for first completions
	time.Sleep(11 * time.Second)
	state = e.State()
	for _, o := range state.CompletedOrders {
		fmt.Printf("[%s] Bot completed %s Order #%d - Status: COMPLETE (Processing time: 10s)\n", ts(), o.Type, o.ID)
	}
	for _, bot := range state.Bots {
		if bot.Order != nil {
			fmt.Printf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING\n", ts(), bot.ID, bot.Order.Type, bot.Order.ID)
		} else {
			fmt.Printf("[%s] Bot #%d is now IDLE - No pending orders\n", ts(), bot.ID)
		}
	}

	// Wait for remaining orders
	time.Sleep(11 * time.Second)
	state = e.State()
	fmt.Printf("[%s] All orders completed so far: %d\n", ts(), len(state.CompletedOrders))

	// Add another VIP
	o4 := e.AddOrder(core.VIP)
	fmt.Printf("[%s] Created %s Order #%d - Status: %s\n", ts(), o4.Type, o4.ID, o4.Status)
	time.Sleep(100 * time.Millisecond)
	state = e.State()
	for _, bot := range state.Bots {
		if bot.Order != nil {
			fmt.Printf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING\n", ts(), bot.ID, bot.Order.Type, bot.Order.ID)
		}
	}

	time.Sleep(11 * time.Second)

	// Remove bot #2
	e.RemoveBot()
	fmt.Printf("[%s] Bot #%d destroyed\n", ts(), b2.ID)

	time.Sleep(1 * time.Second)

	state = e.State()
	fmt.Println()
	fmt.Println("Final Status:")
	vipCount := 0
	normalCount := 0
	for _, o := range state.CompletedOrders {
		if o.Type == core.VIP {
			vipCount++
		} else {
			normalCount++
		}
	}
	total := vipCount + normalCount
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", total, vipCount, normalCount)
	fmt.Printf("- Orders Completed: %d\n", total)
	fmt.Printf("- Active Bots: %d\n", len(state.Bots))
	fmt.Printf("- Pending Orders: %d\n", len(state.PendingOrders))
}
