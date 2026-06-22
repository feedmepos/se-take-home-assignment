package sim

import (
	"fmt"
	"io"
	"strings"
	"time"

	"se-take-home-assignment/internal/order"
	"se-take-home-assignment/internal/types"
)

// RunDemo writes a deterministic simulation for CI and result.txt.
func RunDemo(w io.Writer) error {
	start := time.Date(2026, 6, 19, 9, 0, 0, 0, time.UTC)
	controller := order.NewController(start)

	if _, err := fmt.Fprintln(w, "McDonald's Order Management System - Simulation Results"); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(w); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "[%s] System initialized with 0 bots\n", controller.Now().Format("15:04:05")); err != nil {
		return err
	}

	steps := [][]types.Event{
		controller.AddOrder(types.TypeNormal),
		controller.AddOrder(types.TypeNormal),
		controller.AddOrder(types.TypeVIP),
		controller.AddBot(),
		controller.AddBot(),
		controller.Advance(types.ProcessingDuration),
		controller.AddOrder(types.TypeNormal),
		controller.AddOrder(types.TypeVIP),
		controller.AddBot(),
	}

	removed, err := controller.RemoveBot()
	if err != nil {
		return err
	}
	steps = append(steps, removed)
	steps = append(steps,
		controller.AddOrder(types.TypeNormal),
		controller.Advance(types.ProcessingDuration),
		controller.Advance(types.ProcessingDuration),
	)

	for _, events := range steps {
		if err := writeEvents(w, events); err != nil {
			return err
		}
	}

	return writeStatus(w, controller.Snapshot())
}

func writeEvents(w io.Writer, events []types.Event) error {
	for _, event := range events {
		if _, err := fmt.Fprintln(w, formatEvent(event)); err != nil {
			return err
		}
	}
	return nil
}

func formatEvent(event types.Event) string {
	timestamp := event.At.Format("15:04:05")
	switch event.Kind {
	case types.EventOrderPending:
		return fmt.Sprintf("[%s] Created %s Order #%d - Status: PENDING", timestamp, event.OrderType, event.OrderID)
	case types.EventBotAdded:
		return fmt.Sprintf("[%s] Bot #%d created - Status: ACTIVE", timestamp, event.BotID)
	case types.EventBotStarted:
		return fmt.Sprintf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING", timestamp, event.BotID, event.OrderType, event.OrderID)
	case types.EventOrderCompleted:
		return fmt.Sprintf("[%s] Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)", timestamp, event.BotID, event.OrderType, event.OrderID)
	case types.EventBotRemoved:
		return fmt.Sprintf("[%s] Bot #%d destroyed - Status: REMOVED", timestamp, event.BotID)
	case types.EventOrderRequeued:
		return fmt.Sprintf("[%s] %s Order #%d returned to PENDING after Bot #%d was removed", timestamp, event.OrderType, event.OrderID, event.BotID)
	default:
		return fmt.Sprintf("[%s] unknown event", timestamp)
	}
}

func writeStatus(w io.Writer, snap types.Snapshot) error {
	vipComplete, normalComplete := completedCounts(snap.Complete)
	_, err := fmt.Fprintf(
		w,
		"\nFinal Status:\n- Total Orders Processed: %d (%d VIP, %d Normal)\n- Orders Completed: %d\n- Active Bots: %d\n- Pending Orders: %d\n- Processing Orders: %d\n- Bot Status: %s\n",
		len(snap.Complete),
		vipComplete,
		normalComplete,
		len(snap.Complete),
		len(snap.Bots),
		len(snap.Pending),
		len(snap.Processing),
		formatBots(snap.Bots),
	)
	return err
}

func completedCounts(orders []types.Order) (vip int, normal int) {
	for _, item := range orders {
		switch item.Type {
		case types.TypeVIP:
			vip++
		case types.TypeNormal:
			normal++
		}
	}
	return vip, normal
}

func formatBots(bots []types.Bot) string {
	parts := make([]string, 0, len(bots))
	for _, bot := range bots {
		state := "IDLE"
		if bot.OrderID != 0 {
			state = fmt.Sprintf("PROCESSING Order #%d", bot.OrderID)
		}
		parts = append(parts, fmt.Sprintf("Bot #%d %s", bot.ID, state))
	}
	return strings.Join(parts, ", ")
}
