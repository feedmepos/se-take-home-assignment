package order

import (
	"fmt"
	"sync"
	"time"
)

// Controller manages a queue of orders and a pool of bots, dispatching
// pending orders to idle bots and tracking completed orders.
type Controller struct {
	mu          sync.Mutex
	queue       *Queue
	bots        []*Bot
	completed   []*Order
	nextOrderID uint64
	nextBotID   uint64
	duration    time.Duration
	recorder    *Recorder
}

// ControllerOption configures a Controller during construction.
type ControllerOption func(*Controller)

// WithDuration sets the time an order needs to be processed before it completes.
func WithDuration(d time.Duration) ControllerOption {
	return func(c *Controller) { c.duration = d }
}

// WithRecorder attaches an event recorder to the controller.
func WithRecorder(r *Recorder) ControllerOption {
	return func(c *Controller) { c.recorder = r }
}

// NewController creates a Controller with the given options.
func NewController(opts ...ControllerOption) *Controller {
	c := &Controller{
		queue:       NewQueue(),
		duration:    10 * time.Second,
		nextOrderID: 1,
		nextBotID:   1,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// NewOrder creates a new order with the given type and enqueues it for processing.
func (c *Controller) NewOrder(t OrderType) *Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	o := &Order{ID: c.nextOrderID, Type: t, Status: OrderPending}
	c.nextOrderID++
	c.queue.Push(o)
	c.record("%s → PENDING", orderStr(o))
	c.dispatch()
	return o
}

// AddBot creates a new idle bot and dispatches pending orders to it.
func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()
	bot := &Bot{ID: c.nextBotID, Status: BotIdle}
	c.nextBotID++
	c.bots = append(c.bots, bot)
	c.record("+Bot #%d", bot.ID)
	c.dispatch()
	return bot
}

// RemoveBot removes the most recently added bot. If it was busy, the order
// is returned to the queue at its original position.
func (c *Controller) RemoveBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.bots) == 0 {
		return nil
	}
	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	if bot.Order != nil && bot.Status == BotBusy {
		bot.Order.Status = OrderPending
		bot.Order.ProcessingStarted = time.Time{}
		c.queue.PushReturn(bot.Order)
		c.record("%s → returned to PENDING", orderStr(bot.Order))
	}
	c.record("-Bot #%d", bot.ID)
	return bot
}

// ProcessCompleted checks all busy bots and completes any whose processing
// duration has elapsed. Returns the number of newly completed orders.
func (c *Controller) ProcessCompleted() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	completed := 0
	for _, bot := range c.bots {
		if bot.Order == nil || bot.Order.ProcessingStarted.IsZero() {
			continue
		}
		if time.Since(bot.Order.ProcessingStarted) >= c.duration {
			bot.Order.Status = OrderCompleted
			c.completed = append(c.completed, bot.Order)
			c.record("%s → COMPLETED by Bot #%d", orderStr(bot.Order), bot.ID)
			bot.Order = nil
			bot.Status = BotIdle
			completed++
			if c.queue.Len() > 0 {
				o := c.queue.Pop()
				if o != nil {
					o.Status = OrderProcessing
					o.ProcessingStarted = time.Now()
					bot.Order = o
					bot.Status = BotBusy
					c.record("%s → picked by Bot #%d (completes at %s)", orderStr(o), bot.ID, o.ProcessingStarted.Add(c.duration).Format("15:04:05"))
				}
			}
			if bot.Order == nil {
				c.record("Bot #%d → IDLE (no pending orders)", bot.ID)
			}
		}
	}
	return completed
}

func (c *Controller) dispatch() {
	for _, bot := range c.bots {
		if bot.Order != nil {
			continue
		}
		if c.queue.Len() == 0 {
			return
		}
		o := c.queue.Pop()
		if o == nil {
			return
		}
		o.Status = OrderProcessing
		o.ProcessingStarted = time.Now()
		bot.Order = o
		bot.Status = BotBusy
		c.record("%s → picked by Bot #%d (completes at %s)", orderStr(o), bot.ID, o.ProcessingStarted.Add(c.duration).Format("15:04:05"))
	}
}

// PendingCount returns the number of orders waiting in the queue.
func (c *Controller) PendingCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.queue.Len()
}

// BotCount returns the number of bots in the pool.
func (c *Controller) BotCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bots)
}

// CompletedCount returns the number of orders that have been fully processed.
func (c *Controller) CompletedCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.completed)
}

func (c *Controller) record(format string, args ...any) {
	if c.recorder != nil {
		c.recorder.Record(time.Now(), fmt.Sprintf(format, args...))
	}
}

func orderStr(o *Order) string {
	s := fmt.Sprintf("Order #%d", o.ID)
	if o.Type == OrderVIP {
		s += " (VIP)"
		return s
	}
	s += " (Normal)"
	return s
}
