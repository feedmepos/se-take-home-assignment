package order

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

const ProcessDuration = 10 * time.Second

type OrderType string

const (
	Normal OrderType = "NORMAL"
	VIP    OrderType = "VIP"
)

type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type BotStatus string

const (
	Idle   BotStatus = "IDLE"
	Active BotStatus = "ACTIVE"
)

type Order struct {
	ID        int
	Type      OrderType
	Status    OrderStatus
	Sequence  int
	StartedAt time.Time
	DueAt     time.Time
}

type Bot struct {
	ID      int
	Status  BotStatus
	OrderID int
	DueAt   time.Time
}

type Event struct {
	At      time.Time
	Message string
}

func (e Event) String() string {
	return fmt.Sprintf("[%s] %s", e.At.Format("15:04:05"), e.Message)
}

type Controller struct {
	now         time.Time
	nextOrderID int
	nextBotID   int
	nextSeq     int
	pending     []*Order
	processing  map[int]*Order
	completed   []*Order
	bots        []*Bot
}

func NewController(start time.Time) *Controller {
	return &Controller{
		now:         start,
		nextOrderID: 1001,
		nextBotID:   1,
		processing:  make(map[int]*Order),
	}
}

func (c *Controller) Now() time.Time {
	return c.now
}

func (c *Controller) AddOrder(orderType OrderType) []Event {
	order := &Order{
		ID:       c.nextOrderID,
		Type:     orderType,
		Status:   Pending,
		Sequence: c.nextSeq,
	}
	c.nextOrderID++
	c.nextSeq++

	c.pending = append(c.pending, order)
	c.sortPending()

	events := []Event{c.event("Created %s Order #%d - Status: %s", title(orderType), order.ID, order.Status)}
	events = append(events, c.assignIdleBots()...)
	return events
}

func (c *Controller) AddBot() []Event {
	bot := &Bot{ID: c.nextBotID, Status: Idle}
	c.nextBotID++
	c.bots = append(c.bots, bot)

	events := []Event{c.event("Bot #%d created - Status: %s", bot.ID, Active)}
	events = append(events, c.assignIdleBots()...)
	return events
}

func (c *Controller) RemoveNewestBot() []Event {
	if len(c.bots) == 0 {
		return []Event{c.event("No bot available to destroy")}
	}

	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]

	if bot.OrderID == 0 {
		return []Event{c.event("Bot #%d destroyed while %s", bot.ID, Idle)}
	}

	order := c.processing[bot.OrderID]
	delete(c.processing, bot.OrderID)
	order.Status = Pending
	order.StartedAt = time.Time{}
	order.DueAt = time.Time{}
	c.pending = append(c.pending, order)
	c.sortPending()

	return []Event{c.event("Bot #%d destroyed while processing %s Order #%d - Order returned to PENDING", bot.ID, title(order.Type), order.ID)}
}

func (c *Controller) Advance(duration time.Duration) []Event {
	target := c.now.Add(duration)
	events := make([]Event, 0)

	for {
		nextDue, ok := c.nextDueBefore(target)
		if !ok {
			break
		}

		c.now = nextDue
		var completedBots []*Bot
		for _, bot := range c.bots {
			if bot.OrderID != 0 && bot.DueAt.Equal(nextDue) {
				completedBots = append(completedBots, bot)
			}
		}
		sort.Slice(completedBots, func(i, j int) bool { return completedBots[i].ID < completedBots[j].ID })

		for _, bot := range completedBots {
			order := c.processing[bot.OrderID]
			delete(c.processing, bot.OrderID)
			order.Status = Complete
			c.completed = append(c.completed, order)
			events = append(events, c.event("Bot #%d completed %s Order #%d - Status: %s (Processing time: 10s)", bot.ID, title(order.Type), order.ID, Complete))

			bot.OrderID = 0
			bot.DueAt = time.Time{}
			bot.Status = Idle
		}
		events = append(events, c.assignIdleBots()...)
	}

	c.now = target
	return events
}

func (c *Controller) Snapshot() Snapshot {
	pending := make([]Order, 0, len(c.pending))
	for _, order := range c.pending {
		pending = append(pending, *order)
	}

	processing := make([]Order, 0, len(c.processing))
	for _, order := range c.processing {
		processing = append(processing, *order)
	}
	sort.Slice(processing, func(i, j int) bool { return processing[i].ID < processing[j].ID })

	completed := make([]Order, 0, len(c.completed))
	for _, order := range c.completed {
		completed = append(completed, *order)
	}

	bots := make([]Bot, 0, len(c.bots))
	for _, bot := range c.bots {
		bots = append(bots, *bot)
	}

	return Snapshot{
		Pending:    pending,
		Processing: processing,
		Completed:  completed,
		Bots:       bots,
	}
}

func (c *Controller) assignIdleBots() []Event {
	events := make([]Event, 0)
	for _, bot := range c.bots {
		if bot.OrderID != 0 || len(c.pending) == 0 {
			continue
		}

		order := c.pending[0]
		c.pending = c.pending[1:]

		order.Status = Processing
		order.StartedAt = c.now
		order.DueAt = c.now.Add(ProcessDuration)
		c.processing[order.ID] = order

		bot.Status = Active
		bot.OrderID = order.ID
		bot.DueAt = order.DueAt

		events = append(events, c.event("Bot #%d picked up %s Order #%d - Status: %s", bot.ID, title(order.Type), order.ID, Processing))
	}

	if len(c.pending) == 0 {
		for _, bot := range c.bots {
			if bot.OrderID == 0 {
				events = append(events, c.event("Bot #%d is now %s - No pending orders", bot.ID, Idle))
			}
		}
	}

	return events
}

func (c *Controller) nextDueBefore(target time.Time) (time.Time, bool) {
	var next time.Time
	found := false
	for _, bot := range c.bots {
		if bot.OrderID == 0 || bot.DueAt.After(target) {
			continue
		}
		if !found || bot.DueAt.Before(next) {
			next = bot.DueAt
			found = true
		}
	}
	return next, found
}

func (c *Controller) sortPending() {
	sort.SliceStable(c.pending, func(i, j int) bool {
		left := c.pending[i]
		right := c.pending[j]
		if left.Type != right.Type {
			return left.Type == VIP
		}
		return left.Sequence < right.Sequence
	})
}

func (c *Controller) event(format string, args ...any) Event {
	return Event{At: c.now, Message: fmt.Sprintf(format, args...)}
}

func title(orderType OrderType) string {
	if orderType == VIP {
		return "VIP"
	}
	return strings.Title(strings.ToLower(string(orderType)))
}

type Snapshot struct {
	Pending    []Order
	Processing []Order
	Completed  []Order
	Bots       []Bot
}

func (s Snapshot) TotalOrders() int {
	return len(s.Pending) + len(s.Processing) + len(s.Completed)
}
