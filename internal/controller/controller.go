// Package controller orchestrates the order queue and cooking bots.
// It is the single entry point for all system operations and holds the only
// mutex protecting shared state.
package controller

import (
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/bot"
	"github.com/feedme/se-take-home-assignment/internal/model"
	"github.com/feedme/se-take-home-assignment/internal/queue"
)

// Controller coordinates orders (via PriorityQueue) and cooking bots.
type Controller struct {
	mu           sync.Mutex
	queue        *queue.PriorityQueue
	bots         []*bot.Bot
	nextBotID    int
	resultWriter io.Writer
	newTimer     func() <-chan time.Time
}

// NewController creates a new Controller that writes timestamped events to w.
// timerFn is a factory for timer channels: production uses time.After(10s),
// tests inject a controllable channel.
func NewController(w io.Writer, timerFn func() <-chan time.Time) *Controller {
	c := &Controller{
		queue:        queue.NewQueue(),
		resultWriter: w,
		newTimer:     timerFn,
	}
	c.log("System initialized with 0 bots")
	return c
}

// ResultWriter exposes the writer for test assertions.
func (c *Controller) ResultWriter() io.Writer {
	return c.resultWriter
}

// AddNormalOrder creates a Normal order and enqueues it in PENDING.
// IDLE bots are notified to pick up pending orders.
func (c *Controller) AddNormalOrder() {
	c.mu.Lock()
	defer c.mu.Unlock()

	o := &model.Order{
		ID:        c.queue.NextID(),
		Type:      model.OrderNormal,
		Status:    model.StatusPending,
		CreatedAt: time.Now(),
	}
	c.queue.Enqueue(o)
	c.log("Created Normal Order #%d - Status: PENDING", o.ID)
	c.assignPendingToIdleBots()
}

// AddVIPOrder creates a VIP order and enqueues it in PENDING.
// VIP orders are placed before all Normal orders but behind existing VIP orders.
func (c *Controller) AddVIPOrder() {
	c.mu.Lock()
	defer c.mu.Unlock()

	o := &model.Order{
		ID:        c.queue.NextID(),
		Type:      model.OrderVIP,
		Status:    model.StatusPending,
		CreatedAt: time.Now(),
	}
	c.queue.Enqueue(o)
	c.log("Created VIP Order #%d - Status: PENDING", o.ID)
	c.assignPendingToIdleBots()
}

// AddBot creates a new cooking bot. If the queue has pending orders,
// the bot immediately picks up the highest-priority order. Otherwise
// the bot enters IDLE and waits for new orders.
func (c *Controller) AddBot() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.nextBotID++
	id := c.nextBotID

	callbacks := &model.BotCallbacks{
		OnComplete: func(order *model.Order) {
			c.onBotComplete(id, order)
		},
	}
	b := bot.NewBot(id, callbacks)
	c.bots = append(c.bots, b)
	c.log("Bot #%d created - Status: ACTIVE", id)

	c.assignPendingToIdleBots()
}

// RemoveBot destroys the newest bot (LIFO). If the bot was processing
// an order, the order is rolled back to the front of its priority tier
// in PENDING and processing stops immediately.
func (c *Controller) RemoveBot() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.bots) == 0 {
		return
	}

	// Remove newest bot (LIFO)
	newest := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]

	if newest.Status == model.BotProcessing && newest.CurrentOrder != nil {
		// Stop processing and rollback
		newest.Stop()
		order := newest.CurrentOrder
		order.Status = model.StatusPending
		c.queue.RollbackToFront(order)
		c.log("Bot #%d destroyed - Order #%d returned to PENDING", newest.ID, order.ID)
	} else {
		c.log("Bot #%d destroyed while IDLE", newest.ID)
	}
}

// assignPendingToIdleBots iterates over idle bots and assigns them
// pending orders from the queue. Called internally while holding the lock.
func (c *Controller) assignPendingToIdleBots() {
	for _, b := range c.bots {
		if b.Status == model.BotIdle && !c.queue.IsEmpty() {
			order := c.queue.Dequeue()
			_ = b.Assign(order, c.newTimer())
			c.log("Bot #%d picked up %s Order #%d - Status: PROCESSING",
				b.ID, orderTypeName(order.Type), order.ID)
		}
	}
}

// onBotComplete is called from the Bot's goroutine when an order finishes
// processing. It acquires the lock to safely update state and assign
// the next pending order.
func (c *Controller) onBotComplete(botID int, order *model.Order) {
	c.mu.Lock()
	defer c.mu.Unlock()

	order.Status = model.StatusComplete
	order.CompletedAt = time.Now()
	c.log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)",
		botID, orderTypeName(order.Type), order.ID)

	// Find the bot and reset it
	for _, b := range c.bots {
		if b.ID == botID {
			b.Reset()
			break
		}
	}

	// Try to assign next pending order
	c.assignPendingToIdleBots()
}

// log writes a timestamped event line to the result writer.
func (c *Controller) log(format string, args ...interface{}) {
	now := time.Now()
	timestamp := now.Format("15:04:05")
	msg := fmt.Sprintf(format, args...)
	fmt.Fprintf(c.resultWriter, "[%s] %s\n", timestamp, msg)
}

// PrintStatus outputs a human-readable system status summary to stdout.
func (c *Controller) PrintStatus() {
	c.mu.Lock()
	defer c.mu.Unlock()

	fmt.Fprintf(c.resultWriter, "\n--- System Status ---\n")
	fmt.Fprintf(c.resultWriter, "Bots: %d\n", len(c.bots))
	for _, b := range c.bots {
		status := "IDLE"
		if b.Status == model.BotProcessing {
			status = "PROCESSING"
		}
		if b.CurrentOrder != nil {
			fmt.Fprintf(c.resultWriter, "  Bot #%d [%s] -> Order #%d (%s)\n",
				b.ID, status, b.CurrentOrder.ID, orderTypeName(b.CurrentOrder.Type))
		} else {
			fmt.Fprintf(c.resultWriter, "  Bot #%d [%s]\n", b.ID, status)
		}
	}
	fmt.Fprintf(c.resultWriter, "Pending Orders: %d\n", c.queue.Len())
	fmt.Fprintf(c.resultWriter, "---\n\n")
}

func orderTypeName(t model.OrderType) string {
	switch t {
	case model.OrderVIP:
		return "VIP"
	default:
		return "Normal"
	}
}
