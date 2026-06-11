package controller

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type LogFn func(string)

type Options struct {
	Tick   time.Duration
	Logger LogFn
}

type Controller struct {
	mu          sync.Mutex
	cond        *sync.Cond
	queue       *orderQueue
	completed   []*Order
	bots        []*Bot
	nextOrderID int
	nextBotID   int
	tick        time.Duration
	log         LogFn
}

func New(opts Options) *Controller {
	if opts.Tick == 0 {
		opts.Tick = 10 * time.Second
	}
	if opts.Logger == nil {
		opts.Logger = func(string) {}
	}
	c := &Controller{
		queue:       newOrderQueue(),
		nextOrderID: 1,
		nextBotID:   1,
		tick:        opts.Tick,
		log:         opts.Logger,
	}
	c.cond = sync.NewCond(&c.mu)
	return c
}

func (c *Controller) NewOrder(t OrderType) *Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	o := &Order{ID: c.nextOrderID, Type: t, Status: StatusPending}
	c.nextOrderID++
	c.queue.enqueue(o)
	c.log(fmt.Sprintf("Created %s Order #%d - Status: PENDING", t, o.ID))
	c.cond.Broadcast()
	return o
}

func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	b := newBot(c.nextBotID)
	c.nextBotID++
	c.bots = append(c.bots, b)
	c.log(fmt.Sprintf("Bot #%d created - Status: ACTIVE", b.ID))
	c.mu.Unlock()
	go c.runBot(b)
	return b
}

func (c *Controller) RemoveNewestBot() *Bot {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return nil
	}
	b := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]

	wasProcessing := b.Status == BotProcessing
	currentOrderID := 0
	if b.current != nil {
		currentOrderID = b.current.ID
	}

	b.stop = true
	if b.cancel != nil {
		b.cancel()
	}
	c.cond.Broadcast()
	c.mu.Unlock()

	<-b.done

	if wasProcessing {
		c.log(fmt.Sprintf("Bot #%d destroyed while processing Order #%d - order returned to PENDING", b.ID, currentOrderID))
	} else {
		c.log(fmt.Sprintf("Bot #%d destroyed while IDLE", b.ID))
	}
	return b
}

type Snapshot struct {
	Pending   []OrderView
	Completed []OrderView
	Bots      []BotView
}

type OrderView struct {
	ID   int
	Type OrderType
}

type BotView struct {
	ID      int
	Status  BotStatus
	OrderID int
}

func (c *Controller) Status() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()
	snap := Snapshot{}
	for _, o := range c.queue.snapshot() {
		snap.Pending = append(snap.Pending, OrderView{ID: o.ID, Type: o.Type})
	}
	for _, o := range c.completed {
		snap.Completed = append(snap.Completed, OrderView{ID: o.ID, Type: o.Type})
	}
	for _, b := range c.bots {
		bv := BotView{ID: b.ID, Status: b.Status}
		if b.current != nil {
			bv.OrderID = b.current.ID
		}
		snap.Bots = append(snap.Bots, bv)
	}
	return snap
}

func (c *Controller) WaitIdle(timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		c.mu.Lock()
		empty := c.queue.size() == 0
		allIdle := true
		for _, b := range c.bots {
			if b.Status == BotProcessing {
				allIdle = false
				break
			}
		}
		c.mu.Unlock()
		if empty && allIdle {
			return true
		}
		time.Sleep(20 * time.Millisecond)
	}
	return false
}

func (c *Controller) Shutdown() {
	for {
		c.mu.Lock()
		if len(c.bots) == 0 {
			c.mu.Unlock()
			return
		}
		c.mu.Unlock()
		c.RemoveNewestBot()
	}
}

func (c *Controller) runBot(b *Bot) {
	defer close(b.done)
	becameIdle := false
	for {
		c.mu.Lock()
		if c.queue.size() == 0 && !b.stop && !becameIdle {
			c.log(fmt.Sprintf("Bot #%d is now IDLE - No pending orders", b.ID))
			becameIdle = true
		}
		for c.queue.size() == 0 && !b.stop {
			c.cond.Wait()
		}
		if b.stop {
			c.mu.Unlock()
			return
		}
		order := c.queue.dequeue()
		order.Status = StatusProcessing
		ctx, cancel := context.WithCancel(context.Background())
		b.current = order
		b.cancel = cancel
		b.Status = BotProcessing
		becameIdle = false
		c.log(fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: PROCESSING", b.ID, order.Type, order.ID))
		c.mu.Unlock()

		completed := sleepCtx(ctx, c.tick)

		c.mu.Lock()
		if !completed {
			order.Status = StatusPending
			c.queue.requeueFront(order)
			b.current = nil
			b.cancel = nil
			b.Status = BotIdle
			c.cond.Broadcast()
			c.mu.Unlock()
			return
		}
		order.Status = StatusComplete
		c.completed = append(c.completed, order)
		b.current = nil
		b.cancel = nil
		b.Status = BotIdle
		c.log(fmt.Sprintf("Bot #%d completed %s Order #%d - Status: COMPLETE", b.ID, order.Type, order.ID))
		c.mu.Unlock()
	}
}
