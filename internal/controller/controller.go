package controller

import (
	"context"
	"fmt"
	"slices"
	"sync"
	"time"
)

type OrderType string

const (
	OrderTypeNormal OrderType = "NORMAL"
	OrderTypeVIP    OrderType = "VIP"
)

type BotState string

const (
	BotStateIdle       BotState = "IDLE"
	BotStateProcessing BotState = "PROCESSING"
)

type Order struct {
	ID       int
	Type     OrderType
	QueueSeq int
}

type BotSnapshot struct {
	ID      int
	State   BotState
	OrderID *int
}

type Snapshot struct {
	Pending  []Order
	Complete []Order
	Bots     []BotSnapshot
}

type EventLogger func(string)

type bot struct {
	id      int
	state   BotState
	current *Order
	cancel  context.CancelFunc
	started time.Time
}

type Controller struct {
	mu                 sync.Mutex
	processDuration    time.Duration
	logf               EventLogger
	nextOrderID        int
	nextVIPQueueSeq    int
	nextNormalQueueSeq int
	nextBotID          int
	pendingVIP         []Order
	pendingNormal      []Order
	complete           []Order
	botsByID           map[int]*bot
	botOrder           []int
	schedulerWake      chan struct{}
}

func New(processDuration time.Duration, logger EventLogger) *Controller {
	if logger == nil {
		logger = func(string) {}
	}

	c := &Controller{
		processDuration:    processDuration,
		logf:               logger,
		nextOrderID:        1,
		nextVIPQueueSeq:    1,
		nextNormalQueueSeq: 1,
		nextBotID:          1,
		botsByID:           make(map[int]*bot),
		schedulerWake:      make(chan struct{}, 1),
	}
	go c.schedulerLoop()
	return c
}

func (c *Controller) AddOrder(orderType OrderType) Order {
	c.mu.Lock()
	order := Order{ID: c.nextOrderID, Type: orderType}
	c.nextOrderID++
	if orderType == OrderTypeVIP {
		order.QueueSeq = c.nextVIPQueueSeq
		c.nextVIPQueueSeq++
	} else {
		order.QueueSeq = c.nextNormalQueueSeq
		c.nextNormalQueueSeq++
	}

	c.enqueuePendingLocked(order)
	c.logLocked(fmt.Sprintf("NEW_ORDER id=%d type=%s pending=%d", order.ID, order.Type, c.pendingLenLocked()))
	c.mu.Unlock()

	c.wakeScheduler()
	return order
}

func (c *Controller) AddBot() int {
	c.mu.Lock()
	botID := c.nextBotID
	c.nextBotID++
	c.botsByID[botID] = &bot{id: botID, state: BotStateIdle}
	c.botOrder = append(c.botOrder, botID)
	c.logLocked(fmt.Sprintf("ADD_BOT id=%d total_bots=%d", botID, len(c.botOrder)))
	c.mu.Unlock()

	c.wakeScheduler()
	return botID
}

func (c *Controller) RemoveNewestBot() (int, bool) {
	c.mu.Lock()
	if len(c.botOrder) == 0 {
		c.logLocked("REMOVE_BOT skipped=no_bots")
		c.mu.Unlock()
		return 0, false
	}

	last := len(c.botOrder) - 1
	botID := c.botOrder[last]
	c.botOrder = c.botOrder[:last]

	b := c.botsByID[botID]
	delete(c.botsByID, botID)

	if b.cancel != nil {
		b.cancel()
	}

	if b.current != nil {
		c.enqueuePendingLocked(*b.current)
		c.logLocked(fmt.Sprintf("REMOVE_BOT id=%d interrupted_order=%d", botID, b.current.ID))
	} else {
		c.logLocked(fmt.Sprintf("REMOVE_BOT id=%d", botID))
	}
	c.mu.Unlock()

	c.wakeScheduler()
	return botID, true
}

func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	pending := make([]Order, 0, len(c.pendingVIP)+len(c.pendingNormal))
	pending = append(pending, c.pendingVIP...)
	pending = append(pending, c.pendingNormal...)
	complete := slices.Clone(c.complete)
	bots := make([]BotSnapshot, 0, len(c.botOrder))
	for _, id := range c.botOrder {
		b := c.botsByID[id]
		var orderID *int
		if b.current != nil {
			value := b.current.ID
			orderID = &value
		}
		bots = append(bots, BotSnapshot{ID: b.id, State: b.state, OrderID: orderID})
	}
	return Snapshot{Pending: pending, Complete: complete, Bots: bots}
}

func (c *Controller) WaitForIdle(timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		s := c.Snapshot()
		allIdle := len(s.Pending) == 0
		if allIdle {
			for _, b := range s.Bots {
				if b.State != BotStateIdle {
					allIdle = false
					break
				}
			}
		}
		if allIdle {
			return true
		}
		time.Sleep(5 * time.Millisecond)
	}
	return false
}

func (c *Controller) schedulerLoop() {
	for range c.schedulerWake {
		c.assignPending()
	}
}

func (c *Controller) wakeScheduler() {
	select {
	case c.schedulerWake <- struct{}{}:
	default:
	}
}

func (c *Controller) assignPending() {
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, botID := range c.botOrder {
		if c.pendingLenLocked() == 0 {
			return
		}
		b := c.botsByID[botID]
		if b.state != BotStateIdle {
			continue
		}

		order, ok := c.dequeuePendingLocked()
		if !ok {
			return
		}

		ctx, cancel := context.WithCancel(context.Background())
		b.cancel = cancel
		b.current = &order
		b.state = BotStateProcessing
		b.started = time.Now()

		c.logLocked(fmt.Sprintf("BOT_PICKUP bot=%d order=%d type=%s", b.id, order.ID, order.Type))
		go c.processOrder(ctx, b.id, order)
	}
}

func (c *Controller) processOrder(ctx context.Context, botID int, order Order) {
	timer := time.NewTimer(c.processDuration)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return
	case <-timer.C:
	}

	c.mu.Lock()
	b, ok := c.botsByID[botID]
	if !ok {
		c.mu.Unlock()
		return
	}
	if b.current == nil || b.current.ID != order.ID {
		c.mu.Unlock()
		return
	}

	c.complete = append(c.complete, order)
	b.current = nil
	b.cancel = nil
	b.state = BotStateIdle

	processingSeconds := time.Since(b.started).Seconds()
	c.logLocked(fmt.Sprintf("COMPLETE order=%d type=%s bot=%d duration=%.1fs", order.ID, order.Type, botID, processingSeconds))
	b.started = time.Time{}
	if c.pendingLenLocked() == 0 {
		c.logLocked(fmt.Sprintf("BOT_IDLE bot=%d pending=0", botID))
	}
	c.mu.Unlock()

	c.wakeScheduler()
}

func (c *Controller) enqueuePendingLocked(order Order) {
	if order.Type == OrderTypeVIP {
		c.pendingVIP = appendSortedByQueueSeq(c.pendingVIP, order)
		return
	}
	c.pendingNormal = appendSortedByQueueSeq(c.pendingNormal, order)
}

func (c *Controller) pendingLenLocked() int {
	return len(c.pendingVIP) + len(c.pendingNormal)
}

func (c *Controller) dequeuePendingLocked() (Order, bool) {
	if len(c.pendingVIP) > 0 {
		order := c.pendingVIP[0]
		c.pendingVIP = c.pendingVIP[1:]
		return order, true
	}
	if len(c.pendingNormal) > 0 {
		order := c.pendingNormal[0]
		c.pendingNormal = c.pendingNormal[1:]
		return order, true
	}
	return Order{}, false
}

func appendSortedByQueueSeq(queue []Order, order Order) []Order {
	insertAt := len(queue)
	for i, existing := range queue {
		if order.QueueSeq < existing.QueueSeq {
			insertAt = i
			break
		}
	}
	queue = append(queue, Order{})
	copy(queue[insertAt+1:], queue[insertAt:])
	queue[insertAt] = order
	return queue
}

func (c *Controller) logLocked(msg string) {
	c.logf(fmt.Sprintf("%s %s", time.Now().Format("15:04:05"), msg))
}
