package main

import (
	"fmt"
	"io"
	"sync"
	"time"
)

// OrderType distinguishes VIP from Normal orders.
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

func (t OrderType) String() string {
	if t == VIP {
		return "VIP"
	}
	return "Normal"
}

// Order represents a single customer order.
type Order struct {
	ID   int
	Type OrderType
}

// Bot processes orders one at a time.
type Bot struct {
	ID           int
	CurrentOrder *Order
	removed      bool
	cancel       chan struct{}
}

// Controller manages the pending queue, completed orders, and bots.
type Controller struct {
	mu               sync.Mutex
	pending          []*Order
	completed        []*Order
	bots             []*Bot
	orderCounter     int
	botCounter       int
	processDuration  time.Duration
	out              io.Writer
}

// NewController creates a controller that writes logs to out.
func NewController(processDuration time.Duration, out io.Writer) *Controller {
	return &Controller{
		processDuration: processDuration,
		out:             out,
	}
}

func (c *Controller) log(format string, args ...any) {
	ts := time.Now().Format("15:04:05")
	fmt.Fprintf(c.out, "[%s] "+format+"\n", append([]any{ts}, args...)...)
}

// NewOrder adds an order to the pending queue.
// VIP orders are inserted after the last existing VIP order (before all Normal orders).
// Normal orders are appended at the end.
func (c *Controller) NewOrder(t OrderType) *Order {
	c.mu.Lock()
	c.orderCounter++
	order := &Order{ID: c.orderCounter, Type: t}
	c.insertPending(order)
	if t == VIP {
		c.log("New VIP Order #%d → PENDING (placed ahead of Normal orders)", order.ID)
	} else {
		c.log("New Normal Order #%d → PENDING", order.ID)
	}
	c.mu.Unlock()
	c.assignOrders()
	return order
}

// insertPending inserts order into the pending queue respecting VIP priority.
// Must be called with c.mu held.
func (c *Controller) insertPending(order *Order) {
	if order.Type == VIP {
		idx := 0
		for i, o := range c.pending {
			if o.Type == VIP {
				idx = i + 1
			}
		}
		c.pending = append(c.pending, nil)
		copy(c.pending[idx+1:], c.pending[idx:])
		c.pending[idx] = order
	} else {
		c.pending = append(c.pending, order)
	}
}

// AddBot creates a new bot and starts it processing pending orders.
func (c *Controller) AddBot() {
	c.mu.Lock()
	c.botCounter++
	bot := &Bot{
		ID:     c.botCounter,
		cancel: make(chan struct{}),
	}
	c.bots = append(c.bots, bot)
	c.log("Bot #%d created", bot.ID)
	c.mu.Unlock()
	c.assignOrders()
}

// RemoveBot destroys the newest bot. If it is processing an order, that order
// is returned to the pending queue maintaining VIP/Normal priority.
func (c *Controller) RemoveBot() {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.log("No bots to remove")
		c.mu.Unlock()
		return
	}

	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	bot.removed = true
	order := bot.CurrentOrder
	bot.CurrentOrder = nil
	close(bot.cancel)

	if order != nil {
		c.insertPending(order)
		c.log("Bot #%d removed — %s Order #%d returned to PENDING", bot.ID, order.Type, order.ID)
	} else {
		c.log("Bot #%d removed (was IDLE)", bot.ID)
	}
	c.mu.Unlock()
}

// assignOrders dispatches pending orders to idle bots.
func (c *Controller) assignOrders() {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, bot := range c.bots {
		if len(c.pending) == 0 {
			break
		}
		if bot.CurrentOrder == nil && !bot.removed {
			order := c.pending[0]
			c.pending = c.pending[1:]
			bot.CurrentOrder = order
			c.log("Bot #%d picked up %s Order #%d → PROCESSING", bot.ID, order.Type, order.ID)
			go c.processOrder(bot, order)
		}
	}
}

// processOrder simulates processing an order for processDuration.
// If the bot is cancelled mid-process, the order was already returned by RemoveBot.
func (c *Controller) processOrder(bot *Bot, order *Order) {
	timer := time.NewTimer(c.processDuration)
	select {
	case <-timer.C:
		c.mu.Lock()
		if !bot.removed && bot.CurrentOrder == order {
			bot.CurrentOrder = nil
			c.completed = append(c.completed, order)
			c.log("Bot #%d completed %s Order #%d → COMPLETE", bot.ID, order.Type, order.ID)
		}
		c.mu.Unlock()
		c.assignOrders()
	case <-bot.cancel:
		timer.Stop()
	}
}

// WaitForIdle blocks until no orders are pending or being processed.
func (c *Controller) WaitForIdle() {
	for {
		c.mu.Lock()
		pendingCount := len(c.pending)
		processing := 0
		for _, bot := range c.bots {
			if bot.CurrentOrder != nil {
				processing++
			}
		}
		c.mu.Unlock()
		if pendingCount == 0 && processing == 0 {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
}

// PrintStatus writes a snapshot of the current system state.
func (c *Controller) PrintStatus() {
	c.mu.Lock()
	defer c.mu.Unlock()

	fmt.Fprintln(c.out, "  ┌─ Pending ─────────────────────────────")
	if len(c.pending) == 0 {
		fmt.Fprintln(c.out, "  │  (empty)")
	}
	for i, o := range c.pending {
		fmt.Fprintf(c.out, "  │  %d. [%s] Order #%d\n", i+1, o.Type, o.ID)
	}
	fmt.Fprintln(c.out, "  ├─ Bots ────────────────────────────────")
	if len(c.bots) == 0 {
		fmt.Fprintln(c.out, "  │  (none)")
	}
	for _, b := range c.bots {
		if b.CurrentOrder != nil {
			fmt.Fprintf(c.out, "  │  Bot #%d → PROCESSING Order #%d\n", b.ID, b.CurrentOrder.ID)
		} else {
			fmt.Fprintf(c.out, "  │  Bot #%d → IDLE\n", b.ID)
		}
	}
	fmt.Fprintln(c.out, "  └───────────────────────────────────────")
}
