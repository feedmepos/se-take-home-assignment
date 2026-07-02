package view

import (
	"fmt"
	"io"
	"strings"
	"time"

	"se-take-home-assignment/internal/types"
)

// WriteEvents writes human-readable domain events with timestamps.
func WriteEvents(w io.Writer, events []types.Event) error {
	for _, event := range events {
		if _, err := fmt.Fprintln(w, FormatEvent(event)); err != nil {
			return err
		}
	}
	return nil
}

// FormatEvent returns a user-facing description for a domain event.
func FormatEvent(event types.Event) string {
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

// WriteSnapshot writes the current PENDING, PROCESSING, COMPLETE, and bot areas.
func WriteSnapshot(w io.Writer, snap types.Snapshot) error {
	_, err := fmt.Fprintf(
		w,
		"[%s] Current Status\nPENDING: %s\nPROCESSING: %s\nCOMPLETE: %s\nBOTS: %s\n",
		snap.Now.Format("15:04:05"),
		formatOrders(snap.Pending),
		formatProcessing(snap.Processing),
		formatOrders(snap.Complete),
		formatBots(snap.Bots),
	)
	return err
}

func formatOrders(orders []types.Order) string {
	if len(orders) == 0 {
		return "none"
	}

	parts := make([]string, 0, len(orders))
	for _, order := range orders {
		parts = append(parts, fmt.Sprintf("%s Order #%d", order.Type, order.ID))
	}
	return strings.Join(parts, ", ")
}

func formatProcessing(processing []types.Processing) string {
	if len(processing) == 0 {
		return "none"
	}

	parts := make([]string, 0, len(processing))
	for _, item := range processing {
		parts = append(parts, fmt.Sprintf("Bot #%d -> %s Order #%d (started %s)", item.BotID, item.Order.Type, item.Order.ID, formatTime(item.Order.StartedAt)))
	}
	return strings.Join(parts, ", ")
}

func formatBots(bots []types.Bot) string {
	if len(bots) == 0 {
		return "none"
	}

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

func formatTime(t time.Time) string {
	if t.IsZero() {
		return "--:--:--"
	}
	return t.Format("15:04:05")
}
