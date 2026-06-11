package controller

import (
	"context"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"
)

// Bot is a cooking robot. order == nil means IDLE; otherwise it is
// PROCESSING that order and cancel aborts the in-flight goroutine.
type Bot struct {
	id     int
	order  *Order
	cancel context.CancelFunc
}

// Controller owns all mutable state of the order system. Every state
// transition happens under mu, including the completion path driven by
// bot goroutines, so commands and timers can never interleave mid-update.
type Controller struct {
	mu          sync.Mutex
	pending     *PriorityQueue
	completed   []*Order
	bots        []*Bot
	nextOrderID int
	nextBotID   int
	procDur     time.Duration
	out         io.Writer
}

func New(procDur time.Duration, out io.Writer) *Controller {
	return &Controller{
		pending: NewPriorityQueue(),
		procDur: procDur,
		out:     out,
	}
}

// logf must be called with mu held so output order matches event order.
func (c *Controller) logf(format string, args ...any) {
	fmt.Fprintf(c.out, "[%s] %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}

func (c *Controller) AddNormalOrder() { c.addOrder(Normal) }
func (c *Controller) AddVIPOrder()    { c.addOrder(VIP) }

func (c *Controller) addOrder(t OrderType) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.nextOrderID++
	o := &Order{ID: c.nextOrderID, Type: t}
	c.pending.Enqueue(o)
	c.logf("Created %s Order #%d - Status: PENDING", o.Type, o.ID)
	if bot := c.idleBot(); bot != nil {
		c.assign(bot)
	}
}

// AddBot creates a new bot and immediately lets it pick up work.
func (c *Controller) AddBot() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.nextBotID++
	b := &Bot{id: c.nextBotID}
	c.bots = append(c.bots, b)
	c.logf("Bot #%d created - Status: ACTIVE", b.id)
	c.assign(b)
}

// RemoveBot destroys the newest bot. If it is processing an order, the
// work is aborted and the order re-enters the pending queue under the
// normal priority rules.
func (c *Controller) RemoveBot() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.bots) == 0 {
		c.logf("No bots to destroy")
		return
	}
	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	if bot.order != nil {
		bot.cancel()
		o := bot.order
		bot.order = nil
		bot.cancel = nil
		c.pending.Enqueue(o)
		c.logf("Bot #%d destroyed while processing %s Order #%d - Order returned to PENDING", bot.id, o.Type, o.ID)
		// Another bot may be idle (it found the queue empty earlier);
		// hand the returned order over instead of letting it strand.
		if idle := c.idleBot(); idle != nil {
			c.assign(idle)
		}
		return
	}
	c.logf("Bot #%d destroyed while IDLE", bot.id)
}

// idleBot returns the first idle bot, or nil. Caller must hold mu.
func (c *Controller) idleBot() *Bot {
	for _, b := range c.bots {
		if b.order == nil {
			return b
		}
	}
	return nil
}

// assign hands the highest-priority pending order to bot (which must be
// idle) and starts its processing timer. Caller must hold mu.
func (c *Controller) assign(bot *Bot) {
	o := c.pending.Dequeue()
	if o == nil {
		c.logf("Bot #%d is now IDLE - No pending orders", bot.id)
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	bot.order = o
	bot.cancel = cancel
	c.logf("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.id, o.Type, o.ID)
	d := c.procDur
	go func() {
		select {
		case <-time.After(d):
			c.complete(bot, o)
		case <-ctx.Done():
		}
	}()
}

// complete moves o from bot into the completed list, then lets the bot
// pick up the next order. The bot.order != o guard handles the race
// where the timer fires while RemoveBot is destroying the bot: by the
// time we get the lock the order was already returned to pending, so
// the stale completion must be a no-op.
func (c *Controller) complete(bot *Bot, o *Order) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if bot.order != o {
		return
	}
	bot.order = nil
	bot.cancel = nil
	c.completed = append(c.completed, o)
	c.logf("Bot #%d completed %s Order #%d - Status: COMPLETE (processing time: %s)", bot.id, o.Type, o.ID, c.procDur)
	c.assign(bot)
}

// Drained reports whether all work is finished: no pending orders and
// every bot idle. Used by the `drain` command to wait for completion.
func (c *Controller) Drained() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.pending.Len() > 0 {
		return false
	}
	for _, b := range c.bots {
		if b.order != nil {
			return false
		}
	}
	return true
}

// Status renders a summary of pending / processing / completed orders
// and bot states.
func (c *Controller) Status() string {
	c.mu.Lock()
	defer c.mu.Unlock()

	var b strings.Builder
	b.WriteString("Final Status:\n")

	pend := c.pending.Snapshot()
	fmt.Fprintf(&b, "- Pending Orders: %d%s\n", len(pend), orderList(pend))

	processing := 0
	for _, bot := range c.bots {
		if bot.order != nil {
			processing++
		}
	}
	fmt.Fprintf(&b, "- Active Bots: %d (processing: %d, idle: %d)\n", len(c.bots), processing, len(c.bots)-processing)
	for _, bot := range c.bots {
		if bot.order != nil {
			fmt.Fprintf(&b, "  - Bot #%d: PROCESSING %s Order #%d\n", bot.id, bot.order.Type, bot.order.ID)
		} else {
			fmt.Fprintf(&b, "  - Bot #%d: IDLE\n", bot.id)
		}
	}

	vips := 0
	for _, o := range c.completed {
		if o.Type == VIP {
			vips++
		}
	}
	fmt.Fprintf(&b, "- Completed Orders: %d (%d VIP, %d Normal)%s\n", len(c.completed), vips, len(c.completed)-vips, orderList(c.completed))
	return b.String()
}

func orderList(orders []*Order) string {
	if len(orders) == 0 {
		return ""
	}
	parts := make([]string, len(orders))
	for i, o := range orders {
		parts[i] = fmt.Sprintf("%s #%d", o.Type, o.ID)
	}
	return " [" + strings.Join(parts, ", ") + "]"
}
