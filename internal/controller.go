package internal

import (
	"context"
	"sync"
	"time"
)

// Logger is a function that records a timestamped line of output.
type Logger func(format string, args ...any)

// Controller manages the order queue and bots.
type Controller struct {
	mu              sync.Mutex
	wg              sync.WaitGroup
	queue           *Queue
	bots            []*Bot
	nextOrderID     int
	nextBotID       int
	completedOrders []*Order
	log             Logger
	processingTime  time.Duration
	onComplete      chan struct{} // optional; signalled after each order completion
}

func NewController(log Logger) *Controller {
	return &Controller{
		queue:          &Queue{},
		log:            log,
		processingTime: 10 * time.Second,
	}
}

// newTestController is used in tests to speed up processing and await completions.
func newTestController(log Logger, d time.Duration) (*Controller, <-chan struct{}) {
	ch := make(chan struct{}, 100)
	return &Controller{
		queue:          &Queue{},
		log:            log,
		processingTime: d,
		onComplete:     ch,
	}, ch
}

// AddOrder creates a new order, places it in the queue, and assigns it to an
// idle bot if one is available.
func (c *Controller) AddOrder(t OrderType) *Order {
	order, idleBot := c.addOrderLocked(t)
	if idleBot != nil {
		c.pickUp(idleBot)
	}
	return order
}

func (c *Controller) addOrderLocked(t OrderType) (*Order, *Bot) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.nextOrderID++
	order := &Order{ID: c.nextOrderID, Type: t, status: Pending}
	c.queue.Push(order)
	c.log("New %s Order #%d → PENDING", t, order.ID)

	for _, b := range c.bots {
		if b.status == Idle {
			return order, b
		}
	}
	return order, nil
}

// AddBot creates a new bot and immediately assigns it to a pending order if any.
func (c *Controller) AddBot() *Bot {
	bot := c.addBotLocked()
	c.pickUp(bot)
	return bot
}

func (c *Controller) addBotLocked() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.nextBotID++
	bot := &Bot{ID: c.nextBotID, status: Idle}
	c.bots = append(c.bots, bot)
	c.log("Bot #%d created → IDLE", bot.ID)
	return bot
}

// RemoveBot destroys the newest bot (highest ID). If it is processing an order,
// the order is returned to the queue in its original priority position.
func (c *Controller) RemoveBot() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.bots) == 0 {
		c.log("No bots to remove")
		return
	}

	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]

	if bot.status == Busy && bot.currentOrder != nil {
		order := bot.currentOrder
		bot.currentOrder = nil // clear before signalling goroutine
		bot.cancel()
		order.status = Pending
		c.queue.PushByID(order)
		c.log("Bot #%d removed → Order #%d returned to PENDING", bot.ID, order.ID)
	} else {
		c.log("Bot #%d removed → was IDLE", bot.ID)
	}
}

// Status logs the current state of bots and pending orders.
func (c *Controller) Status() {
	c.mu.Lock()
	defer c.mu.Unlock()

	processing := 0
	for _, b := range c.bots {
		if b.status == Busy {
			processing++
		}
	}
	c.log("Status: bots=%d (processing=%d, idle=%d), pending=%d",
		len(c.bots), processing, len(c.bots)-processing, c.queue.Len())
}

// FinalStatus logs a summary of all completed orders and remaining state.
func (c *Controller) FinalStatus() {
	c.mu.Lock()
	defer c.mu.Unlock()

	vipDone, normalDone := 0, 0
	for _, o := range c.completedOrders {
		if o.Type == VIP {
			vipDone++
		} else {
			normalDone++
		}
	}

	c.log("=== Final Status ===")
	c.log("Total Orders Completed: %d (VIP: %d, Normal: %d)", len(c.completedOrders), vipDone, normalDone)
	c.log("Active Bots: %d", len(c.bots))
	c.log("Pending Orders: %d", c.queue.Len())
}

// pickUp assigns the next pending order to bot, or marks bot IDLE.
func (c *Controller) pickUp(bot *Bot) {
	order, ctx := c.pickUpLocked(bot)
	if order != nil {
		c.wg.Add(1)
		go c.process(bot, order, ctx)
	}
}

func (c *Controller) pickUpLocked(bot *Bot) (*Order, context.Context) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Ensure bot is still registered (may have been removed concurrently).
	found := false
	for _, b := range c.bots {
		if b.ID == bot.ID {
			found = true
			break
		}
	}
	if !found || bot.currentOrder != nil {
		return nil, nil
	}

	order := c.queue.Pop()
	if order == nil {
		bot.status = Idle
		c.log("Bot #%d → IDLE (no pending orders)", bot.ID)
		return nil, nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	bot.status = Busy
	bot.currentOrder = order
	bot.cancel = cancel
	order.status = Processing
	c.log("Bot #%d picks up %s Order #%d → PROCESSING", bot.ID, order.Type, order.ID)
	return order, ctx
}

// process waits processingTime, then completes the order and picks the next one.
// If the bot is removed mid-processing, ctx is cancelled and the goroutine exits.
func (c *Controller) process(bot *Bot, order *Order, ctx context.Context) {
	defer c.wg.Done()

	timer := time.NewTimer(c.processingTime)
	defer timer.Stop()

	select {
	case <-timer.C:
		if c.completeLocked(bot, order) {
			c.notifyComplete()
			c.pickUp(bot)
		}
	case <-ctx.Done():
		// Bot was removed; RemoveBot already re-queued the order.
	}
}

// Wait blocks until all processing goroutines have exited.
func (c *Controller) Wait() {
	c.wg.Wait()
}

// completeLocked marks the order as complete if the bot still owns it.
func (c *Controller) completeLocked(bot *Bot, order *Order) bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	// If bot.currentOrder was cleared by RemoveBot, abort — order already re-queued.
	if bot.currentOrder != order {
		return false
	}
	order.status = Complete
	bot.currentOrder = nil
	c.completedOrders = append(c.completedOrders, order)
	c.log("Bot #%d completed %s Order #%d → COMPLETE", bot.ID, order.Type, order.ID)
	return true
}

// notifyComplete signals the onComplete channel if set.
func (c *Controller) notifyComplete() {
	if c.onComplete != nil {
		c.onComplete <- struct{}{}
	}
}

// --- Query methods (thread-safe) ---

// BotCount returns the number of active bots.
func (c *Controller) BotCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bots)
}

// PendingCount returns the number of pending orders.
func (c *Controller) PendingCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.queue.Len()
}

// BotIDs returns the IDs of all active bots in order.
func (c *Controller) BotIDs() []int {
	c.mu.Lock()
	defer c.mu.Unlock()
	ids := make([]int, len(c.bots))
	for i, b := range c.bots {
		ids[i] = b.ID
	}
	return ids
}

// PeekPendingIDs returns the IDs of pending orders in processing order.
func (c *Controller) PeekPendingIDs() []int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.queue.PeekIDs()
}

// botStatusAt returns the status of the bot at the given index.
func (c *Controller) botStatusAt(index int) BotStatus {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.bots[index].status
}
