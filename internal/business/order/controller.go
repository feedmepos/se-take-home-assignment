package order

import (
	"fmt"
	"sync"
	"time"
)

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

type ControllerOption func(*Controller)

func WithDuration(d time.Duration) ControllerOption {
	return func(c *Controller) { c.duration = d }
}

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
		c.queue.Push(bot.Order)
		c.record("%s → returned to PENDING", orderStr(bot.Order))
	}
	c.record("-Bot #%d", bot.ID)
	return bot
}

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
			c.record("%s → COMPLETED", orderStr(bot.Order))
			bot.Order = nil
			bot.Status = BotIdle
			completed++
		}
	}
	c.dispatch()
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
		o.Status = OrderProcessing
		o.ProcessingStarted = time.Now()
		bot.Order = o
		bot.Status = BotBusy
		c.record("%s → picked by Bot #%d", orderStr(o), bot.ID)
	}
}

func (c *Controller) PendingCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.queue.Len()
}

func (c *Controller) BotCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bots)
}

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
