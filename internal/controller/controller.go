package controller

import (
	"context"
	"sync"
	"time"
)

const DefaultProcessDuration = 10 * time.Second

type EventType string

const (
	EventOrderCreated   EventType = "order_created"
	EventBotCreated     EventType = "bot_created"
	EventOrderPicked    EventType = "order_picked"
	EventOrderCompleted EventType = "order_completed"
	EventBotIdle        EventType = "bot_idle"
	EventBotRemoved     EventType = "bot_removed"
	EventOrderRequeued  EventType = "order_requeued"
	EventNoBotToRemove  EventType = "no_bot_to_remove"
)

type Event struct {
	Type   EventType
	Order  OrderView
	BotID  int
	Detail string
}

type Options struct {
	Timer           Timer
	ProcessDuration time.Duration
	OnEvent         func(Event)
}

type Controller struct {
	mu      sync.Mutex
	timer   Timer
	procDur time.Duration
	onEvent func(Event)
	pending []*Order
	bots    []*bot
	done    []*Order
	all     []*Order
	nextID  int
	nextBot int
}

func New(opts Options) *Controller {
	timer := opts.Timer
	if timer == nil {
		timer = RealTimer{}
	}
	procDur := opts.ProcessDuration
	if procDur == 0 {
		procDur = DefaultProcessDuration
	}
	c := &Controller{
		timer:   timer,
		procDur: procDur,
		onEvent: opts.OnEvent,
		nextID:  1,
		nextBot: 1,
	}
	return c
}

func (c *Controller) AddOrder(kind Kind) OrderView {
	c.mu.Lock()
	order := &Order{ID: c.nextID, Kind: kind, Status: Pending}
	c.nextID++
	c.all = append(c.all, order)
	c.pending = insertOrdered(c.pending, order)
	view := viewOrder(order)
	events := []Event{{Type: EventOrderCreated, Order: view}}
	events = append(events, c.dispatchLocked()...)
	c.mu.Unlock()
	c.emit(events)
	return view
}

func (c *Controller) AddBot() BotView {
	c.mu.Lock()
	b := &bot{id: c.nextBot}
	c.nextBot++
	c.bots = append(c.bots, b)
	view := viewBot(b)
	events := []Event{{Type: EventBotCreated, BotID: b.id}}
	events = append(events, c.dispatchLocked()...)
	c.mu.Unlock()
	c.emit(events)
	return view
}

func (c *Controller) RemoveBot() bool {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		c.emit([]Event{{Type: EventNoBotToRemove}})
		return false
	}

	idx := len(c.bots) - 1
	b := c.bots[idx]
	c.bots = c.bots[:idx]

	var wait <-chan struct{}
	if b.done != nil {
		wait = b.done
	}
	if b.cancel != nil {
		b.cancel()
	}

	events := []Event{{Type: EventBotRemoved, BotID: b.id}}
	if b.current != nil {
		order := b.current
		order.Status = Pending
		b.current = nil
		b.cancel = nil
		b.done = nil
		c.pending = insertOrdered(c.pending, order)
		events = append(events, Event{Type: EventOrderRequeued, BotID: b.id, Order: viewOrder(order)})
		events = append(events, c.dispatchLocked()...)
	}
	c.mu.Unlock()

	if wait != nil {
		<-wait
	}
	c.emit(events)
	return true
}

func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.snapshotLocked()
}

func (c *Controller) WaitDrained(timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for {
		snap := c.Snapshot()
		if len(snap.Pending) == 0 && len(snap.Processing) == 0 {
			return true
		}
		if time.Now().After(deadline) {
			return false
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func (c *Controller) StopAll() {
	for {
		c.mu.Lock()
		hasBot := len(c.bots) > 0
		c.mu.Unlock()
		if !hasBot {
			return
		}
		c.RemoveBot()
	}
}

type Snapshot struct {
	Pending    []OrderView
	Processing []ProcessingView
	Completed  []OrderView
	Bots       []BotView
	AllOrders  []OrderView
}

type ProcessingView struct {
	BotID int
	Order OrderView
}

func (c *Controller) dispatchLocked() []Event {
	var events []Event
	for len(c.pending) > 0 {
		b := c.firstIdleBotLocked()
		if b == nil {
			return events
		}
		order := c.pending[0]
		copy(c.pending, c.pending[1:])
		c.pending[len(c.pending)-1] = nil
		c.pending = c.pending[:len(c.pending)-1]

		order.Status = Processing
		ctx, cancel := context.WithCancel(context.Background())
		done := make(chan struct{})
		b.current = order
		b.cancel = cancel
		b.done = done
		b.idleReported = false

		events = append(events, Event{Type: EventOrderPicked, BotID: b.id, Order: viewOrder(order)})
		timer := c.timer.After(c.procDur)
		go c.process(b, order, ctx, done, timer)
	}
	for _, b := range c.bots {
		if b.current == nil && !b.idleReported {
			b.idleReported = true
			events = append(events, Event{Type: EventBotIdle, BotID: b.id})
		}
	}
	return events
}

func (c *Controller) firstIdleBotLocked() *bot {
	for _, b := range c.bots {
		if b.current == nil {
			return b
		}
	}
	return nil
}

func (c *Controller) process(b *bot, order *Order, ctx context.Context, done chan struct{}, timer <-chan time.Time) {
	defer close(done)
	select {
	case <-timer:
		events := c.finishOrder(b, order)
		c.emit(events)
	case <-ctx.Done():
		return
	}
}

func (c *Controller) finishOrder(b *bot, order *Order) []Event {
	c.mu.Lock()
	defer c.mu.Unlock()

	if b.current != order {
		return nil
	}

	b.current = nil
	b.cancel = nil
	b.done = nil
	order.Status = Complete
	c.done = append(c.done, order)

	events := []Event{{Type: EventOrderCompleted, BotID: b.id, Order: viewOrder(order)}}
	events = append(events, c.dispatchLocked()...)
	return events
}

func (c *Controller) snapshotLocked() Snapshot {
	snap := Snapshot{}
	snap.Pending = make([]OrderView, 0, len(c.pending))
	for _, order := range c.pending {
		snap.Pending = append(snap.Pending, viewOrder(order))
	}
	snap.Completed = make([]OrderView, 0, len(c.done))
	for _, order := range c.done {
		snap.Completed = append(snap.Completed, viewOrder(order))
	}
	snap.Bots = make([]BotView, 0, len(c.bots))
	for _, b := range c.bots {
		snap.Bots = append(snap.Bots, viewBot(b))
		if b.current != nil {
			snap.Processing = append(snap.Processing, ProcessingView{
				BotID: b.id,
				Order: viewOrder(b.current),
			})
		}
	}
	snap.AllOrders = make([]OrderView, 0, len(c.all))
	for _, order := range c.all {
		snap.AllOrders = append(snap.AllOrders, viewOrder(order))
	}
	return snap
}

func (c *Controller) emit(events []Event) {
	if c.onEvent == nil {
		return
	}
	for _, event := range events {
		c.onEvent(event)
	}
}
