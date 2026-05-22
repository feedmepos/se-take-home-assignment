package main

import (
	"fmt"
	"time"

	"feedme-order-poc/engine"
)

func main() {
	// Header (no timestamp)
	engine.PrintLine("McDonald's Order Management System - Simulation Results")
	engine.PrintLine("")

	events := make(chan engine.Event, 256)
	queue := engine.NewOrderQueue()

	// Spec says 10s; for quick local test you can set 2s.
	processDur := 10 * time.Second
	mgr := engine.NewManager(queue, events, processDur)

	// Event printer
	donePrinting := make(chan struct{})
	go func() {
		for e := range events {
			switch e.Type {
			case engine.EvtBotAdded:
				engine.PrintTimed(fmt.Sprintf("Bot #%d created - Status: ACTIVE", e.BotID))
			case engine.EvtBotRemoved:
				engine.PrintTimed(fmt.Sprintf("Bot #%d destroyed (bots=%d)", e.BotID, e.BotsCount))
			case engine.EvtBotCancelled:
				engine.PrintTimed(fmt.Sprintf("Bot #%d destroyed while processing Order #%d - Order returned to PENDING", e.BotID, e.OrderID))
			case engine.EvtOrderPicked:
				engine.PrintTimed(fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: PROCESSING", e.BotID, e.Privilege, e.OrderID))
			case engine.EvtOrderCompleted:
				engine.PrintTimed(fmt.Sprintf("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)", e.BotID, e.Privilege, e.OrderID, e.ProcessingMS/1000))
			case engine.EvtBotIdle:
				// Optional: comment out if too chatty
				// engine.PrintTimed(fmt.Sprintf("Bot #%d is now IDLE - No pending orders", e.BotID))
			}
		}
		close(donePrinting)
	}()

	engine.PrintTimed(fmt.Sprintf("System initialized with %d bots", mgr.BotsCount()))

	nextOrderID := 1
	addOrder := func(p engine.Privilege) {
		o := engine.Order{
			ID:        nextOrderID,
			Privilege: p,
			Status:    engine.Pending,
			CreatedAt: time.Now().UnixMilli(),
		}
		nextOrderID++

		queue.Enqueue(o)
		engine.PrintTimed(fmt.Sprintf("Created %s Order #%d - Status: PENDING", p, o.ID))
		mgr.NotifyNewOrder()
	}

	// Scenario
	addOrder(engine.Normal)
	addOrder(engine.Normal)
	addOrder(engine.VIP)
	addOrder(engine.Normal)

	mgr.AddBot()
	time.Sleep(2 * time.Second)
	mgr.AddBot()

	// Wait long enough for 4 orders with 2 bots (≈20s) plus buffer
	time.Sleep(25 * time.Second)

	// Demonstrate manager removing a bot while IDLE
	mgr.RemoveNewestBot()

	// Final Status (no timestamp)
	total, vip, normal := mgr.Stats()
	activeBots := mgr.BotsCount()
	pending := queue.PendingCount()

	engine.PrintLine("")
	engine.PrintLine("Final Status:")
	engine.PrintLine(fmt.Sprintf("- Total Orders Processed: %d (%d VIP, %d Normal)", total, vip, normal))
	engine.PrintLine(fmt.Sprintf("- Orders Completed: %d", total))
	engine.PrintLine(fmt.Sprintf("- Active Bots: %d", activeBots))
	engine.PrintLine(fmt.Sprintf("- Pending Orders: %d", pending))

	// shutdown printer
	close(events)
	<-donePrinting
}
