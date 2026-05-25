// ABOUTME: Runs deterministic CLI demo scenarios for the order controller.
// ABOUTME: Formats controller state as timestamped text for CI result output.
package app

import (
	"fmt"
	"io"
	"time"

	"feedme-order-controller/internal/orders"
)

func RunDemo(writer io.Writer) error {
	start := time.Date(2026, 5, 25, 9, 0, 0, 0, time.UTC)
	controller := orders.NewController()

	if _, err := fmt.Fprintln(writer, "McDonald's Order Management System - Simulation Results"); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(writer); err != nil {
		return err
	}

	writeEvent(writer, start, "System initialized with 0 bots")

	at := start.Add(time.Second)
	controller.AddOrder(orders.NormalOrder, at)
	writeEvent(writer, at, "Created Normal Order #1 - Status: PENDING")

	at = start.Add(2 * time.Second)
	controller.AddOrder(orders.VIPOrder, at)
	writeEvent(writer, at, "Created VIP Order #2 - Status: PENDING")

	at = start.Add(3 * time.Second)
	controller.AddOrder(orders.NormalOrder, at)
	writeEvent(writer, at, "Created Normal Order #3 - Status: PENDING")

	at = start.Add(4 * time.Second)
	controller.AddBot(at)
	writeEvent(writer, at, "Bot #1 created - Status: ACTIVE")
	writeEvent(writer, at, "Bot #1 picked up VIP Order #2 - Status: PROCESSING")

	at = start.Add(5 * time.Second)
	controller.AddBot(at)
	writeEvent(writer, at, "Bot #2 created - Status: ACTIVE")
	writeEvent(writer, at, "Bot #2 picked up Normal Order #1 - Status: PROCESSING")

	at = start.Add(6 * time.Second)
	controller.RemoveNewestBot(at)
	writeEvent(writer, at, "Bot #2 destroyed while PROCESSING")
	writeEvent(writer, at, "Normal Order #1 returned to PENDING")

	at = start.Add(14 * time.Second)
	controller.AdvanceTo(at)
	writeEvent(writer, at, "Bot #1 completed VIP Order #2 - Status: COMPLETE")
	writeEvent(writer, at, "Bot #1 picked up Normal Order #1 - Status: PROCESSING")

	at = start.Add(24 * time.Second)
	controller.AdvanceTo(at)
	writeEvent(writer, at, "Bot #1 completed Normal Order #1 - Status: COMPLETE")
	writeEvent(writer, at, "Bot #1 picked up Normal Order #3 - Status: PROCESSING")

	at = start.Add(25 * time.Second)
	controller.AddOrder(orders.VIPOrder, at)
	writeEvent(writer, at, "Created VIP Order #4 - Status: PENDING")

	at = start.Add(34 * time.Second)
	controller.AdvanceTo(at)
	writeEvent(writer, at, "Bot #1 completed Normal Order #3 - Status: COMPLETE")
	writeEvent(writer, at, "Bot #1 picked up VIP Order #4 - Status: PROCESSING")

	at = start.Add(44 * time.Second)
	controller.AdvanceTo(at)
	writeEvent(writer, at, "Bot #1 completed VIP Order #4 - Status: COMPLETE")
	writeEvent(writer, at, "Bot #1 is now IDLE - No pending orders")

	snapshot := controller.Snapshot()
	if _, err := fmt.Fprintln(writer); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(writer, "Final Status:"); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(writer, "- Total Orders Created: %d\n", totalOrders(snapshot)); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(writer, "- Orders Completed: %d\n", len(snapshot.CompletedOrders)); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(writer, "- Active Bots: %d\n", len(snapshot.Bots)); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(writer, "- Pending Orders: %d\n", len(snapshot.PendingOrders)); err != nil {
		return err
	}

	return nil
}

func writeEvent(writer io.Writer, at time.Time, message string) {
	fmt.Fprintf(writer, "[%s] %s\n", at.Format("15:04:05"), message)
}

func totalOrders(snapshot orders.Snapshot) int {
	total := len(snapshot.PendingOrders) + len(snapshot.CompletedOrders)
	for _, bot := range snapshot.Bots {
		if bot.CurrentOrder != nil {
			total++
		}
	}
	return total
}
