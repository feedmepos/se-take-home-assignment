package controller

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/feedmepos/order-controller/internal/clock"
	"github.com/feedmepos/order-controller/internal/model"
	"github.com/feedmepos/order-controller/internal/output"
	"github.com/feedmepos/order-controller/internal/queue"
)

type bot struct {
	id      int
	order   *model.Order // nil when idle; guarded by Controller.mu
	removed bool         // true after RemoveBot claims this bot; guarded by Controller.mu
	cancel  context.CancelFunc
	doneCh  chan struct{} // closed when the bot goroutine exits
}

// Controller manages the pending order queue and cooking bots.
// All shared state is guarded by mu; cond is used to wake idle bots.
type Controller struct {
	mu          sync.Mutex
	cond        *sync.Cond
	queue       queue.PendingQueue
	bots        []*bot
	completed   []*model.Order // acceptable for a finite prototype run
	nextOrderID int
	nextBotID   int
	logger      *output.Logger
	procTime    time.Duration
	clk         clock.Clock
	pickupCount int // total orders picked up; incremented after timer is registered
}

func New(logger *output.Logger, procTime time.Duration) *Controller {
	return NewWithClock(logger, procTime, clock.Real{})
}

func NewWithClock(logger *output.Logger, procTime time.Duration, clk clock.Clock) *Controller {
	c := &Controller{
		nextOrderID: 1,
		nextBotID:   1,
		logger:      logger,
		procTime:    procTime,
		clk:         clk,
	}
	c.cond = sync.NewCond(&c.mu)
	return c
}

func (c *Controller) AddOrder(isVIP bool) {
	c.mu.Lock()
	o := &model.Order{ID: c.nextOrderID, IsVIP: isVIP, Status: model.Pending}
	c.nextOrderID++
	if isVIP {
		c.queue.AddVIP(o)
	} else {
		c.queue.AddNormal(o)
	}
	c.cond.Broadcast()
	c.mu.Unlock()

	c.logger.Log("%s Order #%d → PENDING", o.Kind(), o.ID)
}

func (c *Controller) AddBot() {
	ctx, cancel := context.WithCancel(context.Background())
	c.mu.Lock()
	b := &bot{id: c.nextBotID, cancel: cancel, doneCh: make(chan struct{})}
	c.nextBotID++
	c.bots = append(c.bots, b)
	c.mu.Unlock()

	c.logger.Log("Bot #%d created", b.id)
	go c.runBot(ctx, b)
}

func (c *Controller) RemoveBot() {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return
	}
	b := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	b.removed = true
	c.cond.Broadcast()
	c.mu.Unlock()

	c.logger.Log("Bot #%d destroyed", b.id)
	b.cancel()
	<-b.doneCh
}

// requeueBotOrder moves b's current order back to pending. Must be called under c.mu.
// Returns the requeued order so the caller can log after releasing the lock.
func (c *Controller) requeueBotOrder(b *bot) *model.Order {
	o := b.order
	b.order = nil
	o.Status = model.Pending
	c.queue.Requeue(o)
	c.cond.Broadcast()
	return o
}

func (c *Controller) Status() string {
	c.mu.Lock()

	pendingLabels := make([]string, c.queue.Len())
	for i, o := range c.queue.Items() {
		pendingLabels[i] = fmt.Sprintf("%s#%d", o.Kind(), o.ID)
	}

	var processingLabels []string
	for _, b := range c.bots {
		if b.order != nil {
			processingLabels = append(processingLabels, fmt.Sprintf("Bot#%d→%s#%d", b.id, b.order.Kind(), b.order.ID))
		}
	}

	completedIDs := make([]string, len(c.completed))
	for i, o := range c.completed {
		completedIDs[i] = fmt.Sprintf("%s#%d", o.Kind(), o.ID)
	}

	result := fmt.Sprintf("bots=%d | pending=%v | processing=%v | completed=%v",
		len(c.bots), pendingLabels, processingLabels, completedIDs)
	c.mu.Unlock()
	return result
}

// WaitPickedUp blocks until at least n orders have been picked up and their
// processing timers registered. Use this before fake.Advance in tests.
func (c *Controller) WaitPickedUp(n int) {
	c.mu.Lock()
	for c.pickupCount < n {
		c.cond.Wait()
	}
	c.mu.Unlock()
}

// WaitAll blocks until the pending queue is empty and every bot is idle.
func (c *Controller) WaitAll() {
	c.mu.Lock()
	for c.queue.Len() > 0 || c.anyProcessing() {
		c.cond.Wait()
	}
	c.mu.Unlock()
}

func (c *Controller) runBot(ctx context.Context, b *bot) {
	defer close(b.doneCh)
	for {
		o, timer, ok := c.waitAndPickup(b)
		if !ok {
			return
		}
		c.logger.Log("Bot #%d picked up %s Order #%d → PROCESSING", b.id, o.Kind(), o.ID)

		select {
		case <-ctx.Done():
		case <-timer:
		}

		// Both paths converge here: complete normally, or requeue if removed.
		if requeued := c.finishOrder(b, o); requeued != nil {
			c.logger.Log("%s Order #%d returned to PENDING (Bot #%d removed)", requeued.Kind(), requeued.ID, b.id)
			return
		}
	}
}

// waitAndPickup blocks until an order is available or the bot is removed.
// Returns the order and timer, with ok=false if the bot was removed while idle.
func (c *Controller) waitAndPickup(b *bot) (o *model.Order, timer <-chan time.Time, ok bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for c.queue.Len() == 0 && !b.removed {
		c.cond.Wait()
	}
	if b.removed {
		return nil, nil, false
	}
	o = c.queue.Pop()
	o.Status = model.Processing
	b.order = o
	// Register the timer while still holding c.mu so that WaitPickedUp
	// cannot return before the timer is registered in the fake clock.
	timer = c.clk.After(c.procTime)
	c.pickupCount++
	c.cond.Broadcast()
	return o, timer, true
}

// finishOrder completes the order or requeues it if the bot was removed.
// Returns the requeued order for logging, or nil if completed normally.
func (c *Controller) finishOrder(b *bot, o *model.Order) *model.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	if b.removed {
		if b.order != nil {
			return c.requeueBotOrder(b)
		}
		return nil
	}
	b.order = nil
	o.Status = model.Complete
	c.completed = append(c.completed, o)
	c.logger.Log("Bot #%d completed %s Order #%d → COMPLETE", b.id, o.Kind(), o.ID)
	if c.queue.Len() == 0 {
		c.logger.Log("Bot #%d is now IDLE — no pending orders", b.id)
	}
	c.cond.Broadcast()
	return nil
}

func (c *Controller) anyProcessing() bool {
	for _, b := range c.bots {
		if b.order != nil {
			return true
		}
	}
	return false
}
