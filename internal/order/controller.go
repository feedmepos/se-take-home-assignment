package order

import (
	"fmt"
	"time"
)

const (
	firstOrderID       = 1001
	ProcessingDuration = 10 * time.Second
)

type Kind string

const (
	KindNormal Kind = "Normal"
	KindVIP    Kind = "VIP"
)

type Status string

const (
	StatusPending    Status = "PENDING"
	StatusProcessing Status = "PROCESSING"
	StatusComplete   Status = "COMPLETE"
)

type Event struct {
	At      time.Time
	Message string
}

func (e Event) String() string {
	return fmt.Sprintf("[%s] %s", e.At.Format("15:04:05"), e.Message)
}

type OrderView struct {
	ID     int
	Kind   Kind
	Status Status
}

type ProcessingView struct {
	BotID   int
	OrderID int
	Kind    Kind
	Started time.Time
}

type Snapshot struct {
	Pending    []OrderView
	Processing []ProcessingView
	Completed  []OrderView
	IdleBots   []int
	BotIDs     []int
}

type Summary struct {
	OrdersCreated  int
	VIPCreated     int
	NormalCreated  int
	OrdersComplete int
	ActiveBots     int
	PendingOrders  int
	Processing     int
}

type Controller struct {
	now          time.Time
	nextOrderID  int
	nextBotID    int
	nextSequence int

	pending   []*Order
	bots      []*Bot
	completed []*Order
	events    []Event

	vipCreated    int
	normalCreated int
}

type Order struct {
	ID          int
	Kind        Kind
	Status      Status
	sequence    int
	CreatedAt   time.Time
	StartedAt   time.Time
	CompletedAt time.Time
}

type Bot struct {
	ID        int
	current   *Order
	startedAt time.Time
}

func NewController(start time.Time) *Controller {
	c := &Controller{
		now:         start,
		nextOrderID: firstOrderID,
		nextBotID:   1,
	}
	c.logf("System initialized with 0 bots")
	return c
}

func (c *Controller) Now() time.Time {
	return c.now
}

func (c *Controller) Events() []Event {
	events := make([]Event, len(c.events))
	copy(events, c.events)
	return events
}

func (c *Controller) AddNormalOrder() int {
	return c.addOrder(KindNormal)
}

func (c *Controller) AddVIPOrder() int {
	return c.addOrder(KindVIP)
}

func (c *Controller) AddBot() int {
	id := c.nextBotID
	c.nextBotID++

	bot := &Bot{ID: id}
	c.bots = append(c.bots, bot)
	c.logf("Bot #%d created - Status: IDLE", id)

	c.assignIdleBots()
	if bot.current == nil {
		c.logf("Bot #%d is IDLE - No pending orders", id)
	}

	return id
}

func (c *Controller) RemoveBot() (int, bool) {
	if len(c.bots) == 0 {
		c.logf("No bot available to destroy")
		return 0, false
	}

	idx := len(c.bots) - 1
	bot := c.bots[idx]
	c.bots = c.bots[:idx]

	if bot.current == nil {
		c.logf("Bot #%d destroyed while IDLE", bot.ID)
		return bot.ID, true
	}

	order := bot.current
	order.StartedAt = time.Time{}
	c.insertPending(order)
	c.logf(
		"Bot #%d destroyed while processing %s Order #%d - Order returned to PENDING",
		bot.ID,
		order.Kind,
		order.ID,
	)
	c.assignIdleBots()

	return bot.ID, true
}

func (c *Controller) Advance(d time.Duration) {
	if d <= 0 {
		return
	}

	target := c.now.Add(d)
	for {
		bot, completedAt := c.nextCompletion(target)
		if bot == nil {
			break
		}

		c.now = completedAt
		order := bot.current
		bot.current = nil
		bot.startedAt = time.Time{}

		order.Status = StatusComplete
		order.CompletedAt = c.now
		c.completed = append(c.completed, order)
		c.logf(
			"Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %s)",
			bot.ID,
			order.Kind,
			order.ID,
			ProcessingDuration,
		)

		c.assignIdleBots()
		if bot.current == nil {
			c.logf("Bot #%d is now IDLE - No pending orders", bot.ID)
		}
	}

	c.now = target
}

func (c *Controller) Snapshot() Snapshot {
	snapshot := Snapshot{
		Pending:   make([]OrderView, 0, len(c.pending)),
		Completed: make([]OrderView, 0, len(c.completed)),
		BotIDs:    make([]int, 0, len(c.bots)),
	}

	for _, order := range c.pending {
		snapshot.Pending = append(snapshot.Pending, viewOrder(order))
	}
	for _, order := range c.completed {
		snapshot.Completed = append(snapshot.Completed, viewOrder(order))
	}
	for _, bot := range c.bots {
		snapshot.BotIDs = append(snapshot.BotIDs, bot.ID)
		if bot.current == nil {
			snapshot.IdleBots = append(snapshot.IdleBots, bot.ID)
			continue
		}
		snapshot.Processing = append(snapshot.Processing, ProcessingView{
			BotID:   bot.ID,
			OrderID: bot.current.ID,
			Kind:    bot.current.Kind,
			Started: bot.startedAt,
		})
	}

	return snapshot
}

func (c *Controller) Summary() Summary {
	snapshot := c.Snapshot()
	return Summary{
		OrdersCreated:  c.vipCreated + c.normalCreated,
		VIPCreated:     c.vipCreated,
		NormalCreated:  c.normalCreated,
		OrdersComplete: len(snapshot.Completed),
		ActiveBots:     len(snapshot.BotIDs),
		PendingOrders:  len(snapshot.Pending),
		Processing:     len(snapshot.Processing),
	}
}

func (c *Controller) addOrder(kind Kind) int {
	id := c.nextOrderID
	c.nextOrderID++
	c.nextSequence++

	order := &Order{
		ID:        id,
		Kind:      kind,
		Status:    StatusPending,
		sequence:  c.nextSequence,
		CreatedAt: c.now,
	}

	if kind == KindVIP {
		c.vipCreated++
	} else {
		c.normalCreated++
	}

	c.insertPending(order)
	c.logf("Created %s Order #%d - Status: PENDING", kind, id)
	c.assignIdleBots()

	return id
}

func (c *Controller) insertPending(order *Order) {
	order.Status = StatusPending
	order.CompletedAt = time.Time{}

	idx := len(c.pending)
	for i, existing := range c.pending {
		if pendingLess(order, existing) {
			idx = i
			break
		}
	}

	c.pending = append(c.pending, nil)
	copy(c.pending[idx+1:], c.pending[idx:])
	c.pending[idx] = order
}

func (c *Controller) assignIdleBots() {
	for _, bot := range c.bots {
		if bot.current != nil || len(c.pending) == 0 {
			continue
		}

		order := c.pending[0]
		c.pending = c.pending[1:]
		order.Status = StatusProcessing
		order.StartedAt = c.now

		bot.current = order
		bot.startedAt = c.now
		c.logf("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, order.Kind, order.ID)
	}
}

func (c *Controller) nextCompletion(target time.Time) (*Bot, time.Time) {
	var selected *Bot
	var selectedAt time.Time

	for _, bot := range c.bots {
		if bot.current == nil {
			continue
		}

		completedAt := bot.startedAt.Add(ProcessingDuration)
		if completedAt.After(target) {
			continue
		}
		if selected == nil || completedAt.Before(selectedAt) || completedAt.Equal(selectedAt) && bot.ID < selected.ID {
			selected = bot
			selectedAt = completedAt
		}
	}

	return selected, selectedAt
}

func (c *Controller) logf(format string, args ...any) {
	c.events = append(c.events, Event{
		At:      c.now,
		Message: fmt.Sprintf(format, args...),
	})
}

func pendingLess(a, b *Order) bool {
	if a.Kind != b.Kind {
		return a.Kind == KindVIP
	}
	return a.sequence < b.sequence
}

func viewOrder(order *Order) OrderView {
	return OrderView{
		ID:     order.ID,
		Kind:   order.Kind,
		Status: order.Status,
	}
}
