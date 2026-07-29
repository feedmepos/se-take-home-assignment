package controller

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/bot"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

type Snapshot struct {
	Pending  []*order.Order
	Complete []*order.Order
	Bots     []*bot.Bot
}

type botHandle struct {
	bot    *bot.Bot
	cancel context.CancelFunc
	ctx    context.Context
	done   chan struct{}
}

type Controller struct {
	mu          sync.Mutex
	cond        *sync.Cond
	processTime time.Duration
	log         func(string)
	nextOrderID int
	nextBotID   int
	pending     []*order.Order
	complete    []*order.Order
	bots        []*botHandle
}

func New(processTime time.Duration, logFn func(string)) *Controller {
	if logFn == nil {
		logFn = func(string) {}
	}
	c := &Controller{
		processTime: processTime,
		log:         logFn,
		nextOrderID: 1,
		nextBotID:   1,
	}
	c.cond = sync.NewCond(&c.mu)
	return c
}

func (c *Controller) CreateNormalOrder() *order.Order {
	return c.createOrder(order.TypeNormal)
}

func (c *Controller) CreateVIPOrder() *order.Order {
	return c.createOrder(order.TypeVIP)
}

func (c *Controller) createOrder(t order.Type) *order.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	o := &order.Order{
		ID:     c.nextOrderID,
		Type:   t,
		Status: order.StatusPending,
	}
	c.nextOrderID++
	c.pending = order.InsertPending(c.pending, o)
	c.log(fmt.Sprintf("Created %s Order #%d - Status: PENDING", t, o.ID))
	c.cond.Broadcast()
	return o
}

func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	pending := append([]*order.Order(nil), c.pending...)
	complete := append([]*order.Order(nil), c.complete...)
	bots := make([]*bot.Bot, 0, len(c.bots))
	for _, h := range c.bots {
		cp := *h.bot
		bots = append(bots, &cp)
	}
	return Snapshot{Pending: pending, Complete: complete, Bots: bots}
}

func (c *Controller) AddBot() *bot.Bot {
	c.mu.Lock()
	b := &bot.Bot{ID: c.nextBotID, Status: bot.StatusIdle}
	c.nextBotID++
	ctx, cancel := context.WithCancel(context.Background())
	h := &botHandle{bot: b, cancel: cancel, ctx: ctx, done: make(chan struct{})}
	c.bots = append(c.bots, h)
	c.log(fmt.Sprintf("Bot #%d created - Status: ACTIVE", b.ID))
	c.mu.Unlock()
	go c.runBot(h)
	return b
}

func (c *Controller) RemoveBot() (*bot.Bot, bool) {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return nil, false
	}
	last := len(c.bots) - 1
	h := c.bots[last]
	c.bots = c.bots[:last]
	c.mu.Unlock()

	h.cancel()
	// Wake Waiters so a cancelled idle bot can exit.
	c.mu.Lock()
	c.cond.Broadcast()
	c.mu.Unlock()

	<-h.done // wait for runBot to requeue (if needed) and exit

	c.log(fmt.Sprintf("Bot #%d destroyed", h.bot.ID))
	return h.bot, true
}

func (c *Controller) runBot(h *botHandle) {
	defer close(h.done)
	for {
		c.mu.Lock()
		for len(c.pending) == 0 && h.ctx.Err() == nil {
			h.bot.Status = bot.StatusIdle
			h.bot.CurrentOrder = nil
			c.cond.Wait()
		}
		if h.ctx.Err() != nil {
			c.requeueIfNeededLocked(h)
			c.mu.Unlock()
			return
		}
		o := c.pending[0]
		c.pending = c.pending[1:]
		o.Status = order.StatusProcessing
		h.bot.Status = bot.StatusProcessing
		h.bot.CurrentOrder = o
		pt := c.processTime
		c.log(fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: PROCESSING", h.bot.ID, o.Type, o.ID))
		c.mu.Unlock()

		timer := time.NewTimer(pt)
		select {
		case <-timer.C:
			c.mu.Lock()
			if h.ctx.Err() != nil {
				// destroyed during/after timer — treat as cancel
				c.requeueOrderLocked(o)
				h.bot.Status = bot.StatusIdle
				h.bot.CurrentOrder = nil
				c.mu.Unlock()
				return
			}
			o.Status = order.StatusComplete
			c.complete = append(c.complete, o)
			h.bot.Status = bot.StatusIdle
			h.bot.CurrentOrder = nil
			c.log(fmt.Sprintf("Bot #%d completed %s Order #%d - Status: COMPLETE", h.bot.ID, o.Type, o.ID))
			c.mu.Unlock()
		case <-h.ctx.Done():
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			c.mu.Lock()
			c.requeueOrderLocked(o)
			h.bot.Status = bot.StatusIdle
			h.bot.CurrentOrder = nil
			c.mu.Unlock()
			return
		}
	}
}

func (c *Controller) requeueIfNeededLocked(h *botHandle) {
	if h.bot.CurrentOrder != nil && h.bot.CurrentOrder.Status == order.StatusProcessing {
		c.requeueOrderLocked(h.bot.CurrentOrder)
	}
	h.bot.CurrentOrder = nil
	h.bot.Status = bot.StatusIdle
}

func (c *Controller) requeueOrderLocked(o *order.Order) {
	// Only PROCESSING orders may be requeued — avoids double-requeue vs COMPLETE.
	if o.Status != order.StatusProcessing {
		return
	}
	o.Status = order.StatusPending
	c.pending = order.InsertPending(c.pending, o)
	c.log(fmt.Sprintf("Order #%d returned to PENDING", o.ID))
}
