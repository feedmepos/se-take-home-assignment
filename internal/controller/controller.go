package controller

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/feedmepos/order-controller/internal/model"
	"github.com/feedmepos/order-controller/internal/output"
	"github.com/feedmepos/order-controller/internal/queue"
)

type bot struct {
	id      int
	order   *model.Order // nil when idle; guarded by Controller.mu
	removed bool         // true after RemoveBot claims this bot; guarded by Controller.mu
	cancel  context.CancelFunc
}

// Controller manages the pending order queue and cooking bots.
// All shared state is guarded by mu; cond is used to wake idle bots.
type Controller struct {
	mu          sync.Mutex
	cond        *sync.Cond
	queue       queue.PendingQueue
	bots        []*bot
	completed   []*model.Order
	nextOrderID int
	nextBotID   int
	logger      *output.Logger
	ProcTime    time.Duration
}

func New(logger *output.Logger, procTime time.Duration) *Controller {
	c := &Controller{
		nextOrderID: 1,
		nextBotID:   1,
		logger:      logger,
		ProcTime:    procTime,
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
	c.logger.Log("%s Order #%d → PENDING", o.Kind(), o.ID)
	c.cond.Broadcast()
	c.mu.Unlock()
}

func (c *Controller) AddBot() {
	ctx, cancel := context.WithCancel(context.Background())
	c.mu.Lock()
	b := &bot{id: c.nextBotID, cancel: cancel}
	c.nextBotID++
	c.bots = append(c.bots, b)
	c.logger.Log("Bot #%d created", b.id)
	c.mu.Unlock()

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
	o := b.order
	b.order = nil

	if o != nil {
		o.Status = model.Pending
		c.queue.Requeue(o)
		c.logger.Log("%s Order #%d returned to PENDING (Bot #%d removed)", o.Kind(), o.ID, b.id)
	}
	c.logger.Log("Bot #%d destroyed", b.id)
	c.cond.Broadcast()
	c.mu.Unlock()

	b.cancel()
}

func (c *Controller) Status() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	processing := 0
	for _, b := range c.bots {
		if b.order != nil {
			processing++
		}
	}
	return fmt.Sprintf("bots=%d pending=%d processing=%d completed=%d",
		len(c.bots), c.queue.Len(), processing, len(c.completed))
}

func (c *Controller) runBot(ctx context.Context, b *bot) {
	for {
		// Wait until there is a pending order or the bot is removed.
		c.mu.Lock()
		for c.queue.Len() == 0 && !b.removed {
			c.cond.Wait()
		}
		if b.removed {
			c.mu.Unlock()
			return
		}

		o := c.queue.Pop()
		o.Status = model.Processing
		b.order = o
		c.logger.Log("Bot #%d picked up %s Order #%d → PROCESSING", b.id, o.Kind(), o.ID)
		c.mu.Unlock()

		// Process the order.
		select {
		case <-ctx.Done():
			// RemoveBot already set b.removed, cleared b.order, and requeued o.
			return
		case <-time.After(c.ProcTime):
		}

		// Timer fired: complete the order, unless RemoveBot ran concurrently.
		c.mu.Lock()
		if b.removed {
			// RemoveBot ran between timer firing and here; it already requeued o.
			c.mu.Unlock()
			return
		}
		b.order = nil
		o.Status = model.Complete
		c.completed = append(c.completed, o)
		c.logger.Log("Bot #%d completed %s Order #%d → COMPLETE", b.id, o.Kind(), o.ID)
		c.cond.Broadcast() // wake WaitAll if queue and bots are now idle
		c.mu.Unlock()
	}
}

// WaitAll blocks until the pending queue is empty and every bot is idle.
func (c *Controller) WaitAll() {
	c.mu.Lock()
	for c.queue.Len() > 0 || c.anyProcessing() {
		c.cond.Wait()
	}
	c.mu.Unlock()
}

func (c *Controller) anyProcessing() bool {
	for _, b := range c.bots {
		if b.order != nil {
			return true
		}
	}
	return false
}
