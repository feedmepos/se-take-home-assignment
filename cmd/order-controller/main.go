package main

import (
	"fmt"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/order"
)

func main() {
	start := time.Date(2026, 7, 1, 14, 32, 0, 0, time.Local)
	controller := order.NewController(start)

	fmt.Println("McDonald's Order Management System - CLI Simulation")
	printEvent(order.Event{At: controller.Now(), Message: "System initialized with 0 bots"})

	run := func(events []order.Event) {
		for _, event := range events {
			printEvent(event)
		}
	}

	run(controller.AddOrder(order.Normal))
	run(controller.Advance(1 * time.Second))
	run(controller.AddOrder(order.VIP))
	run(controller.AddOrder(order.Normal))
	run(controller.Advance(1 * time.Second))
	run(controller.AddBot())
	run(controller.Advance(1 * time.Second))
	run(controller.AddBot())
	run(controller.Advance(5 * time.Second))
	run(controller.AddOrder(order.VIP))
	run(controller.Advance(2 * time.Second))
	run(controller.RemoveNewestBot())
	run(controller.Advance(4 * time.Second))
	run(controller.AddBot())
	run(controller.Advance(30 * time.Second))
	run(controller.RemoveNewestBot())

	printSummary(controller.Snapshot())
}

func printEvent(event order.Event) {
	fmt.Println(event.String())
}

func printSummary(snapshot order.Snapshot) {
	vipCompleted := 0
	normalCompleted := 0
	for _, completed := range snapshot.Completed {
		switch completed.Type {
		case order.VIP:
			vipCompleted++
		case order.Normal:
			normalCompleted++
		}
	}

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Created: %d\n", snapshot.TotalOrders())
	fmt.Printf("- Orders Completed: %d (%d VIP, %d Normal)\n", len(snapshot.Completed), vipCompleted, normalCompleted)
	fmt.Printf("- Active Bots: %d\n", len(snapshot.Bots))
	fmt.Printf("- Pending Orders: %d\n", len(snapshot.Pending))
	fmt.Printf("- Processing Orders: %d\n", len(snapshot.Processing))
}
