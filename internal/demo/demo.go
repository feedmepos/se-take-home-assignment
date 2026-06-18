package demo

import (
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/controller"
)

func Run(w io.Writer) error {
	base := time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC)
	c := controller.New()

	fmt.Fprintln(w, "McDonald's Order Controller - Simulation Results")
	fmt.Fprintln(w)
	fmt.Fprintf(w, "[%s] System initialized with 0 bots\n", stamp(base))

	eventIndex := 0
	flush := func() {
		events := c.Snapshot(base).Events
		for _, event := range events[eventIndex:] {
			fmt.Fprintf(w, "[%s] %s\n", stamp(event.Time), event.Message)
		}
		eventIndex = len(events)
	}

	fmt.Fprintln(w)
	fmt.Fprintln(w, "Scenario: VIP priority")
	c.CreateOrder(controller.NormalOrder, base.Add(1*time.Second))
	c.CreateOrder(controller.NormalOrder, base.Add(2*time.Second))
	c.CreateOrder(controller.VIPOrder, base.Add(3*time.Second))
	c.AddBot(base.Add(4 * time.Second))
	flush()

	fmt.Fprintln(w)
	fmt.Fprintln(w, "Scenario: bot capacity and automatic completion")
	c.Tick(base.Add(14 * time.Second))
	c.AddBot(base.Add(15 * time.Second))
	c.CreateOrder(controller.VIPOrder, base.Add(16*time.Second))
	c.AddBot(base.Add(17 * time.Second))
	c.Tick(base.Add(24 * time.Second))
	c.Tick(base.Add(25 * time.Second))
	c.Tick(base.Add(27 * time.Second))
	flush()

	fmt.Fprintln(w)
	fmt.Fprintln(w, "Scenario: removing idle and processing bots")
	c.RemoveNewestBot(base.Add(28 * time.Second))
	c.RemoveNewestBot(base.Add(29 * time.Second))
	c.RemoveNewestBot(base.Add(30 * time.Second))
	c.CreateOrder(controller.NormalOrder, base.Add(31*time.Second))
	c.AddBot(base.Add(32 * time.Second))
	c.RemoveNewestBot(base.Add(37 * time.Second))
	c.Tick(base.Add(45 * time.Second))
	flush()

	snapshot := c.Snapshot(base.Add(45 * time.Second))
	fmt.Fprintln(w)
	fmt.Fprintln(w, "Final Status:")
	fmt.Fprintf(w, "- Pending Orders: %s\n", orderList(snapshot.Pending))
	fmt.Fprintf(w, "- Completed Orders: %s\n", orderList(snapshot.Completed))
	fmt.Fprintf(w, "- Active Bots: %d\n", len(snapshot.Bots))

	return nil
}

func stamp(t time.Time) string {
	return t.Format("15:04:05")
}

func orderList(orders []controller.Order) string {
	if len(orders) == 0 {
		return "none"
	}
	parts := make([]string, 0, len(orders))
	for _, order := range orders {
		parts = append(parts, fmt.Sprintf("%s #%d", order.Type, order.ID))
	}
	return strings.Join(parts, ", ")
}
