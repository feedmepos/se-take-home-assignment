package order

import (
	"fmt"
	"strings"
)

func (c *Controller) StatusTable() string {
	c.mu.Lock()
	defer c.mu.Unlock()

	pending := orderLabels(c.pendingOrders(), false)
	completed := orderLabels(c.completed, false)
	processing := orderLabels(c.processing, true)
	bots := botLabels(c.bots)

	rowCount := max(len(pending), len(completed), len(processing), len(bots))
	if rowCount == 0 {
		rowCount = 1
	}

	rows := [][]string{
		{"Pending", "Processing", "Completed", "Bots"},
		{"-------", "----------", "---------", "----"},
	}

	for i := 0; i < rowCount; i++ {
		rows = append(rows, []string{
			valueAt(pending, i),
			valueAt(processing, i),
			valueAt(completed, i),
			valueAt(bots, i),
		})
	}

	widths := columnWidths(rows)
	lines := make([]string, 0, len(rows))
	for _, row := range rows {
		lines = append(lines, fmt.Sprintf(
			"%-*s | %-*s | %-*s | %-*s",
			widths[0], row[0],
			widths[1], row[1],
			widths[2], row[2],
			widths[3], row[3],
		))
	}

	lines = append(lines, "")
	lines = append(lines, fmt.Sprintf(
		"Summary: %d pending, %d processing, %d completed, %d bots",
		len(c.pendingVIP)+len(c.pendingNormal),
		len(c.processing),
		len(c.completed),
		len(c.bots),
	))

	return strings.Join(lines, "\n")
}

func (c *Controller) FinalStatus() string {
	c.mu.Lock()
	defer c.mu.Unlock()

	totalOrders := len(c.pendingVIP) + len(c.pendingNormal) + len(c.processing) + len(c.completed)
	vipOrders, normalOrders := c.orderKindCounts()

	return fmt.Sprintf(
		"Final Status:\n- Total Orders Processed: %d (%d VIP, %d Normal)\n- Orders Completed: %d\n- Active Bots: %d\n- Pending Orders: %d",
		totalOrders,
		vipOrders,
		normalOrders,
		len(c.completed),
		len(c.bots),
		len(c.pendingVIP)+len(c.pendingNormal),
	)
}

func (c *Controller) orderKindCounts() (vip int, normal int) {
	for _, order := range c.pendingOrders() {
		if order.Kind == VIP {
			vip++
		} else {
			normal++
		}
	}
	for _, order := range c.processing {
		if order.Kind == VIP {
			vip++
		} else {
			normal++
		}
	}
	for _, order := range c.completed {
		if order.Kind == VIP {
			vip++
		} else {
			normal++
		}
	}
	return vip, normal
}

func orderLabels(orders []*Order, includeBot bool) []string {
	labels := make([]string, 0, len(orders))
	for _, order := range orders {
		label := fmt.Sprintf("Order #%d %s", order.ID, order.Kind)
		if includeBot && order.BotID != 0 {
			label = fmt.Sprintf("%s - Bot #%d", label, order.BotID)
		}
		labels = append(labels, label)
	}
	return labels
}

func botLabels(bots []Bot) []string {
	labels := make([]string, 0, len(bots))
	for _, bot := range bots {
		labels = append(labels, fmt.Sprintf("Bot #%d - %s", bot.ID, bot.State))
	}
	return labels
}

func valueAt(values []string, index int) string {
	if index >= len(values) {
		return "-"
	}
	return values[index]
}

func columnWidths(rows [][]string) []int {
	widths := []int{0, 0, 0, 0}
	for _, row := range rows {
		for i, value := range row {
			if len(value) > widths[i] {
				widths[i] = len(value)
			}
		}
	}
	return widths
}

func max(values ...int) int {
	result := 0
	for _, value := range values {
		if value > result {
			result = value
		}
	}
	return result
}
