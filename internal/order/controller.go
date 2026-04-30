package order

import (
	"fmt"
	"io"
	"sort"
	"strings"
)

const ProcessingSeconds = 10

type Kind string

const (
	Normal Kind = "Normal"
	VIP    Kind = "VIP"
)

type Status string

const (
	Pending    Status = "PENDING"
	Processing Status = "PROCESSING"
	Complete   Status = "COMPLETE"
	Idle       Status = "IDLE"
)

type Order struct {
	ID        int
	Kind      Kind
	Status    Status
	Sequence  int
	StartedAt int
	DueAt     int
}

type Bot struct {
	ID      int
	Status  Status
	OrderID int
	DueAt   int
}

type Controller struct {
	now         int
	nextOrderID int
	nextBotID   int
	orders      map[int]*Order
	pending     []*Order
	completed   []*Order
	bots        []*Bot
	log         []string
}

func NewController() *Controller {
	c := &Controller{
		nextOrderID: 1001,
		nextBotID:   1,
		orders:      make(map[int]*Order),
	}
	c.logf("System initialized with 0 bots")
	return c
}

func (c *Controller) AddOrder(kind Kind) int {
	if kind != VIP {
		kind = Normal
	}
	order := &Order{
		ID:       c.nextOrderID,
		Kind:     kind,
		Status:   Pending,
		Sequence: c.nextOrderID,
	}
	c.nextOrderID++
	c.orders[order.ID] = order
	c.enqueue(order)
	c.logf("Created %s Order #%d - Status: %s", order.Kind, order.ID, order.Status)
	c.assignIdleBots()
	return order.ID
}

func (c *Controller) AddBot() int {
	bot := &Bot{ID: c.nextBotID, Status: Idle}
	c.nextBotID++
	c.bots = append(c.bots, bot)
	c.logf("Bot #%d created - Status: %s", bot.ID, bot.Status)
	c.assignIdleBots()
	return bot.ID
}

func (c *Controller) RemoveBot() bool {
	if len(c.bots) == 0 {
		c.logf("No bot available to destroy")
		return false
	}
	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	if bot.Status == Processing {
		order := c.orders[bot.OrderID]
		order.Status = Pending
		order.StartedAt = 0
		order.DueAt = 0
		c.enqueue(order)
		c.logf("Bot #%d destroyed while processing %s Order #%d - order returned to PENDING", bot.ID, order.Kind, order.ID)
		c.assignIdleBots()
		return true
	}
	c.logf("Bot #%d destroyed while IDLE", bot.ID)
	return true
}

func (c *Controller) Advance(seconds int) {
	if seconds < 0 {
		return
	}
	target := c.now + seconds
	for {
		bot := c.nextCompletingBot(target)
		if bot == nil {
			break
		}
		c.now = bot.DueAt
		c.complete(bot)
		c.assignIdleBots()
	}
	c.now = target
}

func (c *Controller) PendingIDs() []int {
	ids := make([]int, len(c.pending))
	for i, order := range c.pending {
		ids[i] = order.ID
	}
	return ids
}

func (c *Controller) CompletedIDs() []int {
	ids := make([]int, len(c.completed))
	for i, order := range c.completed {
		ids[i] = order.ID
	}
	return ids
}

func (c *Controller) BotCount() int {
	return len(c.bots)
}

func (c *Controller) Now() int {
	return c.now
}

func (c *Controller) WriteLog(w io.Writer) error {
	return c.WriteLogFrom(w, 0)
}

func (c *Controller) LogLen() int {
	return len(c.log)
}

func (c *Controller) WriteLogFrom(w io.Writer, start int) error {
	if start < 0 {
		start = 0
	}
	if start > len(c.log) {
		start = len(c.log)
	}
	for _, line := range c.log[start:] {
		if _, err := fmt.Fprintln(w, line); err != nil {
			return err
		}
	}
	return nil
}

func (c *Controller) Summary() string {
	var vip, normal int
	for _, order := range c.completed {
		if order.Kind == VIP {
			vip++
		} else {
			normal++
		}
	}
	return fmt.Sprintf("Final Status:\n- Total Orders Processed: %d (%d VIP, %d Normal)\n- Orders Completed: %d\n- Active Bots: %d\n- Pending Orders: %d",
		len(c.completed), vip, normal, len(c.completed), len(c.bots), len(c.pending))
}

func (c *Controller) Snapshot() string {
	var pending []string
	for _, order := range c.pending {
		pending = append(pending, fmt.Sprintf("#%d:%s", order.ID, order.Kind))
	}
	var bots []string
	for _, bot := range c.bots {
		if bot.Status == Processing {
			bots = append(bots, fmt.Sprintf("#%d:%s #%d due %s", bot.ID, bot.Status, bot.OrderID, formatTime(bot.DueAt)))
		} else {
			bots = append(bots, fmt.Sprintf("#%d:%s", bot.ID, bot.Status))
		}
	}
	return fmt.Sprintf("Pending: [%s] | Complete: %v | Bots: [%s]", strings.Join(pending, ", "), c.CompletedIDs(), strings.Join(bots, ", "))
}

func (c *Controller) enqueue(order *Order) {
	c.pending = append(c.pending, order)
	sort.SliceStable(c.pending, func(i, j int) bool {
		if c.pending[i].Kind != c.pending[j].Kind {
			return c.pending[i].Kind == VIP
		}
		return c.pending[i].Sequence < c.pending[j].Sequence
	})
}

func (c *Controller) assignIdleBots() {
	for _, bot := range c.bots {
		if bot.Status != Idle || len(c.pending) == 0 {
			continue
		}
		order := c.pending[0]
		c.pending = c.pending[1:]
		order.Status = Processing
		order.StartedAt = c.now
		order.DueAt = c.now + ProcessingSeconds
		bot.Status = Processing
		bot.OrderID = order.ID
		bot.DueAt = order.DueAt
		c.logf("Bot #%d picked up %s Order #%d - Status: %s", bot.ID, order.Kind, order.ID, order.Status)
	}
}

func (c *Controller) nextCompletingBot(target int) *Bot {
	var next *Bot
	for _, bot := range c.bots {
		if bot.Status != Processing || bot.DueAt > target {
			continue
		}
		if next == nil || bot.DueAt < next.DueAt || bot.DueAt == next.DueAt && bot.ID < next.ID {
			next = bot
		}
	}
	return next
}

func (c *Controller) complete(bot *Bot) {
	order := c.orders[bot.OrderID]
	order.Status = Complete
	c.completed = append(c.completed, order)
	c.logf("Bot #%d completed %s Order #%d - Status: %s (Processing time: %ds)", bot.ID, order.Kind, order.ID, order.Status, ProcessingSeconds)
	bot.Status = Idle
	bot.OrderID = 0
	bot.DueAt = 0
	if len(c.pending) == 0 {
		c.logf("Bot #%d is now IDLE - No pending orders", bot.ID)
	}
}

func (c *Controller) logf(format string, args ...any) {
	c.log = append(c.log, fmt.Sprintf("[%s] %s", formatTime(c.now), fmt.Sprintf(format, args...)))
}

func formatTime(seconds int) string {
	seconds = ((seconds % 86400) + 86400) % 86400
	h := seconds / 3600
	m := seconds % 3600 / 60
	s := seconds % 60
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}
