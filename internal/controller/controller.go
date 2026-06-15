package controller

import (
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	defaultFirstOrderID = 1001
	defaultProcessTime  = 10 * time.Second
)

type OrderKind string

const (
	Normal OrderKind = "Normal"
	VIP    OrderKind = "VIP"
)

type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type BotStatus string

const (
	Idle BotStatus = "IDLE"
	Busy BotStatus = "PROCESSING"
)

type Order struct {
	ID          int
	Kind        OrderKind
	Status      OrderStatus
	CreatedAt   time.Time
	StartedAt   time.Time
	CompletedAt time.Time
}

type Bot struct {
	ID         int
	Status     BotStatus
	Order      *Order
	StartedAt  time.Time
	CompleteAt time.Time
}

type Controller struct {
	mu          sync.RWMutex
	nextOrderID int
	nextBotID   int
	processTime time.Duration
	pending     []*Order
	completed   []*Order
	bots        []*Bot
	events      []string
}

type Snapshot struct {
	Pending       []Order
	Completed     []Order
	Bots          []BotSnapshot
	TotalOrders   int
	CompletedVIP  int
	CompletedNorm int
}

type BotSnapshot struct {
	ID         int
	Status     BotStatus
	OrderID    int
	OrderKind  OrderKind
	CompleteAt time.Time
}

func New() *Controller {
	return &Controller{
		nextOrderID: defaultFirstOrderID,
		nextBotID:   1,
		processTime: defaultProcessTime,
	}
}

func NewWithProcessTime(processTime time.Duration) *Controller {
	c := New()
	c.processTime = processTime
	return c
}

func (c *Controller) Init(now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.log(now, "System initialized with 0 bots")
}

func (c *Controller) Reset(now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()

	processTime := c.processTime
	if processTime == 0 {
		processTime = defaultProcessTime
	}

	c.nextOrderID = defaultFirstOrderID
	c.nextBotID = 1
	c.processTime = processTime
	c.pending = nil
	c.completed = nil
	c.bots = nil
	c.events = nil
	c.log(now, "System initialized with 0 bots")
}

func (c *Controller) AddOrder(kind OrderKind, now time.Time) *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	if kind != VIP {
		kind = Normal
	}
	order := &Order{
		ID:        c.nextOrderID,
		Kind:      kind,
		Status:    Pending,
		CreatedAt: now,
	}
	c.nextOrderID++
	c.pending = append(c.pending, order)
	c.sortPending()
	c.log(now, "Created %s Order #%d - Status: %s", order.Kind, order.ID, order.Status)
	c.dispatchIdleBots(now)
	orderCopy := *order
	return &orderCopy
}

func (c *Controller) AddBot(now time.Time) *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	bot := &Bot{ID: c.nextBotID, Status: Idle}
	c.nextBotID++
	c.bots = append(c.bots, bot)
	c.log(now, "Bot #%d created - Status: ACTIVE", bot.ID)
	c.dispatchIdleBots(now)
	if bot.Status == Idle {
		c.log(now, "Bot #%d is now IDLE - No pending orders", bot.ID)
	}
	botCopy := *bot
	return &botCopy
}

func (c *Controller) RemoveNewestBot(now time.Time) (*Bot, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.bots) == 0 {
		c.log(now, "No bot available to destroy")
		return nil, false
	}

	idx := len(c.bots) - 1
	bot := c.bots[idx]
	c.bots = c.bots[:idx]

	if bot.Status == Busy && bot.Order != nil {
		order := bot.Order
		order.Status = Pending
		order.StartedAt = time.Time{}
		c.pending = append(c.pending, order)
		c.sortPending()
		c.log(now, "Bot #%d destroyed while processing %s Order #%d - Order returned to PENDING", bot.ID, order.Kind, order.ID)
		c.dispatchIdleBots(now)
		botCopy := *bot
		return &botCopy, true
	}

	c.log(now, "Bot #%d destroyed while IDLE", bot.ID)
	botCopy := *bot
	return &botCopy, true
}

func (c *Controller) AdvanceTo(now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for {
		nextAt, ok := c.nextCompletionBefore(now)
		if !ok {
			return
		}

		completedBots := make([]*Bot, 0)
		for _, bot := range c.bots {
			if bot.Status == Busy && !bot.CompleteAt.After(nextAt) {
				c.completeOrder(bot, nextAt)
				completedBots = append(completedBots, bot)
			}
		}
		c.dispatchIdleBots(nextAt)
		for _, bot := range completedBots {
			if bot.Status == Idle && len(c.pending) == 0 {
				c.log(nextAt, "Bot #%d is now IDLE - No pending orders", bot.ID)
			}
		}
	}
}

func (c *Controller) WriteEvents(w io.Writer) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	for _, event := range c.events {
		if _, err := fmt.Fprintln(w, event); err != nil {
			return err
		}
	}
	return nil
}

func (c *Controller) Events() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	events := make([]string, len(c.events))
	copy(events, c.events)
	return events
}

func (c *Controller) Snapshot() Snapshot {
	c.mu.RLock()
	defer c.mu.RUnlock()

	s := Snapshot{
		Pending:     make([]Order, 0, len(c.pending)),
		Completed:   make([]Order, 0, len(c.completed)),
		Bots:        make([]BotSnapshot, 0, len(c.bots)),
		TotalOrders: c.nextOrderID - defaultFirstOrderID,
	}
	for _, order := range c.pending {
		s.Pending = append(s.Pending, *order)
	}
	for _, order := range c.completed {
		s.Completed = append(s.Completed, *order)
		if order.Kind == VIP {
			s.CompletedVIP++
		} else {
			s.CompletedNorm++
		}
	}
	for _, bot := range c.bots {
		bs := BotSnapshot{ID: bot.ID, Status: bot.Status, CompleteAt: bot.CompleteAt}
		if bot.Order != nil {
			bs.OrderID = bot.Order.ID
			bs.OrderKind = bot.Order.Kind
		}
		s.Bots = append(s.Bots, bs)
	}
	return s
}

func (c *Controller) StatusText() string {
	s := c.Snapshot()
	var b strings.Builder
	fmt.Fprintf(&b, "Bots: %d\n", len(s.Bots))
	for _, bot := range s.Bots {
		if bot.Status == Busy {
			fmt.Fprintf(&b, "- Bot #%d: PROCESSING %s Order #%d, completes at %s\n", bot.ID, bot.OrderKind, bot.OrderID, bot.CompleteAt.Format("15:04:05"))
		} else {
			fmt.Fprintf(&b, "- Bot #%d: IDLE\n", bot.ID)
		}
	}

	fmt.Fprintf(&b, "Pending Orders: %d", len(s.Pending))
	if len(s.Pending) > 0 {
		b.WriteString(" [")
		for i, order := range s.Pending {
			if i > 0 {
				b.WriteString(", ")
			}
			fmt.Fprintf(&b, "%s #%d", order.Kind, order.ID)
		}
		b.WriteString("]")
	}
	fmt.Fprintf(&b, "\nCompleted Orders: %d\n", len(s.Completed))
	return strings.TrimRight(b.String(), "\n")
}

func (c *Controller) SummaryText() string {
	s := c.Snapshot()
	return fmt.Sprintf("Final Status:\n- Total Orders Created: %d\n- Total Orders Processed: %d (%d VIP, %d Normal)\n- Orders Completed: %d\n- Active Bots: %d\n- Pending Orders: %d",
		s.TotalOrders,
		len(s.Completed),
		s.CompletedVIP,
		s.CompletedNorm,
		len(s.Completed),
		len(s.Bots),
		len(s.Pending),
	)
}

func (c *Controller) completeOrder(bot *Bot, now time.Time) {
	order := bot.Order
	order.Status = Complete
	order.CompletedAt = now
	c.completed = append(c.completed, order)
	c.log(now, "Bot #%d completed %s Order #%d - Status: %s (Processing time: %s)", bot.ID, order.Kind, order.ID, order.Status, c.processTime)

	bot.Status = Idle
	bot.Order = nil
	bot.StartedAt = time.Time{}
	bot.CompleteAt = time.Time{}
}

func (c *Controller) dispatchIdleBots(now time.Time) {
	sort.Slice(c.bots, func(i, j int) bool { return c.bots[i].ID < c.bots[j].ID })
	for _, bot := range c.bots {
		if bot.Status != Idle || len(c.pending) == 0 {
			continue
		}
		order := c.pending[0]
		c.pending = c.pending[1:]
		order.Status = Processing
		order.StartedAt = now
		bot.Status = Busy
		bot.Order = order
		bot.StartedAt = now
		bot.CompleteAt = now.Add(c.processTime)
		c.log(now, "Bot #%d picked up %s Order #%d - Status: %s", bot.ID, order.Kind, order.ID, order.Status)
	}
}

func (c *Controller) nextCompletionBefore(now time.Time) (time.Time, bool) {
	var next time.Time
	found := false
	for _, bot := range c.bots {
		if bot.Status != Busy {
			continue
		}
		if bot.CompleteAt.After(now) {
			continue
		}
		if !found || bot.CompleteAt.Before(next) {
			next = bot.CompleteAt
			found = true
		}
	}
	return next, found
}

func (c *Controller) sortPending() {
	sort.SliceStable(c.pending, func(i, j int) bool {
		left, right := c.pending[i], c.pending[j]
		if left.Kind != right.Kind {
			return left.Kind == VIP
		}
		return left.ID < right.ID
	})
}

func (c *Controller) log(now time.Time, format string, args ...any) {
	c.events = append(c.events, fmt.Sprintf("[%s] %s", now.Format("15:04:05"), fmt.Sprintf(format, args...)))
}
