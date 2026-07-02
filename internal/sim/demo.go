package sim

import (
	"fmt"
	"io"
	"strings"
	"time"

	"se-take-home-assignment/internal/order"
	"se-take-home-assignment/internal/types"
	"se-take-home-assignment/internal/view"
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
		if err := view.WriteEvents(w, events); err != nil {
			return err
		}
	}

	return writeStatus(w, controller.Snapshot())
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
