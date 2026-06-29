package controller

import (
	"fmt"
	"strings"
	"time"
)

const (
	defaultFirstOrderID = 1001
	defaultFirstBotID   = 1
)

type OrderKind string

const (
	NormalOrder OrderKind = "Normal"
	VIPOrder    OrderKind = "VIP"
)

type OrderStatus string

const (
	OrderPending    OrderStatus = "PENDING"
	OrderProcessing OrderStatus = "PROCESSING"
	OrderComplete   OrderStatus = "COMPLETE"
)

type BotStatus string

const (
	BotIdle       BotStatus = "IDLE"
	BotProcessing BotStatus = "PROCESSING"
)

type LogEntry struct {
	At      time.Time
	Message string
}

func (l LogEntry) String() string {
	return fmt.Sprintf("[%s] %s", l.At.Format("15:04:05"), l.Message)
}

type OrderView struct {
	ID     int
	Kind   OrderKind
	Status OrderStatus
}

type BotView struct {
	ID             int
	Status         BotStatus
	CurrentOrderID int
}

type Snapshot struct {
	Pending    []OrderView
	Processing []OrderView
	Completed  []OrderView
	Bots       []BotView
}

type Controller struct {
	processingDuration time.Duration

	nextOrderID int
	nextBotID   int
	nextEventID int

	pending   []*order
	completed []*order
	bots      []*bot
	botsByID  map[int]*bot
	orders    map[int]*order
	events    []completionEvent
}

type order struct {
	id     int
	kind   OrderKind
	status OrderStatus
}

type bot struct {
	id             int
	status         BotStatus
	currentOrderID int
	completionID   int
}

type completionEvent struct {
	id      int
	dueAt   time.Time
	botID   int
	orderID int
}

func New(processingDuration time.Duration) *Controller {
	if processingDuration <= 0 {
		processingDuration = 10 * time.Second
	}

	return &Controller{
		processingDuration: processingDuration,
		nextOrderID:        defaultFirstOrderID,
		nextBotID:          defaultFirstBotID,
		nextEventID:        1,
		botsByID:           make(map[int]*bot),
		orders:             make(map[int]*order),
	}
}

func NewDefault() *Controller {
	return New(10 * time.Second)
}

func (c *Controller) Initialized(now time.Time) []LogEntry {
	return []LogEntry{c.log(now, "System initialized with 0 bots")}
}

func (c *Controller) AddOrder(kind OrderKind, now time.Time) []LogEntry {
	if kind != VIPOrder {
		kind = NormalOrder
	}

	o := &order{
		id:     c.nextOrderID,
		kind:   kind,
		status: OrderPending,
	}
	c.nextOrderID++
	c.orders[o.id] = o
	c.insertPending(o)

	logs := []LogEntry{c.log(now, "Created %s Order #%d - Status: %s", o.kind, o.id, o.status)}
	logs = append(logs, c.assignIdleBots(now)...)
	return logs
}

func (c *Controller) AddBot(now time.Time) []LogEntry {
	b := &bot{
		id:     c.nextBotID,
		status: BotIdle,
	}
	c.nextBotID++
	c.bots = append(c.bots, b)
	c.botsByID[b.id] = b

	logs := []LogEntry{c.log(now, "Bot #%d created - Status: %s", b.id, b.status)}
	logs = append(logs, c.startNextOrder(b, now, false)...)
	return logs
}

func (c *Controller) RemoveBot(now time.Time) []LogEntry {
	if len(c.bots) == 0 {
		return []LogEntry{c.log(now, "No bot available to destroy")}
	}

	lastIndex := len(c.bots) - 1
	b := c.bots[lastIndex]
	c.bots = c.bots[:lastIndex]
	delete(c.botsByID, b.id)

	if b.status == BotProcessing {
		o := c.orders[b.currentOrderID]
		if o != nil {
			o.status = OrderPending
			c.insertPending(o)
			return []LogEntry{
				c.log(now, "Bot #%d destroyed while processing %s Order #%d - Order returned to PENDING", b.id, o.kind, o.id),
			}
		}
	}

	return []LogEntry{c.log(now, "Bot #%d destroyed while IDLE", b.id)}
}

func (c *Controller) AdvanceTo(now time.Time) []LogEntry {
	var logs []LogEntry

	for {
		eventIndex := c.nextDueEventIndex(now)
		if eventIndex < 0 {
			return logs
		}

		event := c.events[eventIndex]
		c.events = append(c.events[:eventIndex], c.events[eventIndex+1:]...)
		logs = append(logs, c.completeOrder(event)...)
	}
}

func (c *Controller) Status(now time.Time) []LogEntry {
	snapshot := c.Snapshot()
	return []LogEntry{
		c.log(now, "Status: bots=%s pending=%s processing=%s complete=%s",
			formatBots(snapshot.Bots),
			formatOrders(snapshot.Pending),
			formatOrders(snapshot.Processing),
			formatOrders(snapshot.Completed),
		),
	}
}

func (c *Controller) Summary(now time.Time) []LogEntry {
	snapshot := c.Snapshot()
	vipCompleted := 0
	normalCompleted := 0
	for _, o := range snapshot.Completed {
		if o.Kind == VIPOrder {
			vipCompleted++
		} else {
			normalCompleted++
		}
	}

	return []LogEntry{
		c.log(now, "Final Status: total_orders=%d completed=%d vip_completed=%d normal_completed=%d active_bots=%d pending=%d",
			len(c.orders),
			len(snapshot.Completed),
			vipCompleted,
			normalCompleted,
			len(snapshot.Bots),
			len(snapshot.Pending),
		),
		c.log(now, "Completed Orders: %s", formatOrders(snapshot.Completed)),
		c.log(now, "Pending Orders: %s", formatOrders(snapshot.Pending)),
	}
}

func (c *Controller) Snapshot() Snapshot {
	snapshot := Snapshot{
		Pending:   make([]OrderView, 0, len(c.pending)),
		Completed: make([]OrderView, 0, len(c.completed)),
		Bots:      make([]BotView, 0, len(c.bots)),
	}

	for _, o := range c.pending {
		snapshot.Pending = append(snapshot.Pending, orderView(o))
	}

	for _, o := range c.completed {
		snapshot.Completed = append(snapshot.Completed, orderView(o))
	}

	for _, b := range c.bots {
		snapshot.Bots = append(snapshot.Bots, BotView{
			ID:             b.id,
			Status:         b.status,
			CurrentOrderID: b.currentOrderID,
		})
		if b.status == BotProcessing {
			if o := c.orders[b.currentOrderID]; o != nil {
				snapshot.Processing = append(snapshot.Processing, orderView(o))
			}
		}
	}

	return snapshot
}

func (c *Controller) assignIdleBots(now time.Time) []LogEntry {
	var logs []LogEntry
	for _, b := range c.bots {
		if len(c.pending) == 0 {
			return logs
		}
		if b.status == BotIdle {
			logs = append(logs, c.startNextOrder(b, now, false)...)
		}
	}
	return logs
}

func (c *Controller) startNextOrder(b *bot, now time.Time, logIdle bool) []LogEntry {
	if len(c.pending) == 0 {
		b.status = BotIdle
		b.currentOrderID = 0
		b.completionID = 0
		if logIdle {
			return []LogEntry{c.log(now, "Bot #%d is now IDLE - No pending orders", b.id)}
		}
		return nil
	}

	o := c.pending[0]
	c.pending = c.pending[1:]
	o.status = OrderProcessing

	eventID := c.nextEventID
	c.nextEventID++

	b.status = BotProcessing
	b.currentOrderID = o.id
	b.completionID = eventID

	c.events = append(c.events, completionEvent{
		id:      eventID,
		dueAt:   now.Add(c.processingDuration),
		botID:   b.id,
		orderID: o.id,
	})

	return []LogEntry{c.log(now, "Bot #%d picked up %s Order #%d - Status: %s", b.id, o.kind, o.id, o.status)}
}

func (c *Controller) completeOrder(event completionEvent) []LogEntry {
	b := c.botsByID[event.botID]
	if b == nil || b.status != BotProcessing || b.currentOrderID != event.orderID || b.completionID != event.id {
		return nil
	}

	o := c.orders[event.orderID]
	if o == nil || o.status != OrderProcessing {
		return nil
	}

	o.status = OrderComplete
	c.completed = append(c.completed, o)

	b.status = BotIdle
	b.currentOrderID = 0
	b.completionID = 0

	logs := []LogEntry{
		c.log(event.dueAt, "Bot #%d completed %s Order #%d - Status: %s (Processing time: %s)",
			b.id,
			o.kind,
			o.id,
			o.status,
			formatDuration(c.processingDuration),
		),
	}
	logs = append(logs, c.startNextOrder(b, event.dueAt, true)...)
	return logs
}

func (c *Controller) insertPending(o *order) {
	insertAt := len(c.pending)
	for i, existing := range c.pending {
		if orderBefore(o, existing) {
			insertAt = i
			break
		}
	}

	c.pending = append(c.pending, nil)
	copy(c.pending[insertAt+1:], c.pending[insertAt:])
	c.pending[insertAt] = o
}

func (c *Controller) nextDueEventIndex(now time.Time) int {
	bestIndex := -1
	for i, event := range c.events {
		if event.dueAt.After(now) {
			continue
		}
		if bestIndex == -1 {
			bestIndex = i
			continue
		}

		best := c.events[bestIndex]
		if event.dueAt.Before(best.dueAt) || (event.dueAt.Equal(best.dueAt) && event.id < best.id) {
			bestIndex = i
		}
	}
	return bestIndex
}

func orderBefore(left, right *order) bool {
	if left.kind != right.kind {
		return left.kind == VIPOrder
	}
	return left.id < right.id
}

func orderView(o *order) OrderView {
	return OrderView{
		ID:     o.id,
		Kind:   o.kind,
		Status: o.status,
	}
}

func (c *Controller) log(now time.Time, format string, args ...any) LogEntry {
	return LogEntry{
		At:      now,
		Message: fmt.Sprintf(format, args...),
	}
}

func formatOrders(orders []OrderView) string {
	if len(orders) == 0 {
		return "[]"
	}

	parts := make([]string, 0, len(orders))
	for _, o := range orders {
		parts = append(parts, fmt.Sprintf("#%d %s %s", o.ID, o.Kind, o.Status))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func formatBots(bots []BotView) string {
	if len(bots) == 0 {
		return "[]"
	}

	parts := make([]string, 0, len(bots))
	for _, b := range bots {
		if b.Status == BotProcessing {
			parts = append(parts, fmt.Sprintf("#%d %s order=#%d", b.ID, b.Status, b.CurrentOrderID))
			continue
		}
		parts = append(parts, fmt.Sprintf("#%d %s", b.ID, b.Status))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func formatDuration(duration time.Duration) string {
	if duration%time.Second == 0 {
		return fmt.Sprintf("%ds", int(duration/time.Second))
	}
	return duration.String()
}
