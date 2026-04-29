package mcd

import (
	"fmt"
	"io"
	"sync"
	"time"
)

// Controller manages orders and bots
type Controller struct {
	mu              sync.Mutex
	pending         []*Order
	completed       []*Order
	bots            []*Bot
	nextOrderID     int
	nextBotID       int
	signal          chan struct{}
	processDuration time.Duration
	clock           Clock
	out             *SafeWriter
	closed          bool
}

const maxCompletedOrders = 1000

// logf writes a timestamped log message
func (c *Controller) logf(format string, args ...interface{}) {
	timestamp := c.clock.Now().Format("15:04:05")
	fmt.Fprintf(c.out, "[%s] %s\n", timestamp, fmt.Sprintf(format, args...))
}

// NewController creates a controller with default settings
func NewController(out io.Writer) *Controller {
	return NewControllerWithClock(out, RealClock{}, 10*time.Second)
}

// NewControllerWithClock creates a controller with custom clock and duration
func NewControllerWithClock(out io.Writer, clock Clock, processDuration time.Duration) *Controller {
	safeOut, ok := out.(*SafeWriter)
	if !ok {
		safeOut = NewSafeWriter(out)
	}

	return &Controller{
		pending:         make([]*Order, 0),
		completed:       make([]*Order, 0),
		bots:            make([]*Bot, 0),
		nextOrderID:     1,
		nextBotID:       1,
		signal:          make(chan struct{}, 1),
		processDuration: processDuration,
		clock:           clock,
		out:             safeOut,
	}
}

// NewNormalOrder creates a new normal order
func (c *Controller) NewNormalOrder() *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		return nil
	}

	order := &Order{
		ID:       c.nextOrderID,
		Priority: Normal,
	}
	c.nextOrderID++
	c.pending = append(c.pending, order)
	c.logf("order %s created (PENDING)", order)

	// Wake waiting bots
	select {
	case c.signal <- struct{}{}:
	default:
	}

	return order
}

// NewVIPOrder creates a new VIP order
func (c *Controller) NewVIPOrder() *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		return nil
	}

	order := &Order{
		ID:       c.nextOrderID,
		Priority: VIP,
	}
	c.nextOrderID++
	c.pending = insertSorted(c.pending, order)
	c.logf("order %s created (PENDING)", order)

	// Wake waiting bots
	select {
	case c.signal <- struct{}{}:
	default:
	}

	return order
}

// AddBot adds a new bot
func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		return nil
	}

	bot := newBot(c.nextBotID)
	c.nextBotID++
	c.bots = append(c.bots, bot)
	c.logf("bot #%d created (IDLE)", bot.ID)

	// Start bot goroutine
	go bot.run(c)

	// Wake the new bot
	select {
	case c.signal <- struct{}{}:
	default:
	}

	return bot
}

// RemoveBot removes the newest bot
func (c *Controller) RemoveBot() *Bot {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return nil
	}

	// Pop last bot
	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	wasProcessing := bot.currentOrder != nil

	// Cancel and wait for cleanup
	bot.cancel()
	c.mu.Unlock()

	<-bot.done

	if wasProcessing {
		c.logf("bot #%d destroyed (was PROCESSING)", bot.ID)
	} else {
		c.logf("bot #%d destroyed (was IDLE)", bot.ID)
	}

	return bot
}

// Snapshot returns current state
type Snapshot struct {
	Pending   []*Order
	Completed []*Order
	Bots      []BotSnapshot
}

type BotSnapshot struct {
	ID           int
	CurrentOrder *Order
}

func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	snap := Snapshot{
		Pending:   make([]*Order, len(c.pending)),
		Completed: make([]*Order, len(c.completed)),
		Bots:      make([]BotSnapshot, len(c.bots)),
	}

	copy(snap.Pending, c.pending)
	copy(snap.Completed, c.completed)

	for i, bot := range c.bots {
		snap.Bots[i] = BotSnapshot{
			ID:           bot.ID,
			CurrentOrder: bot.currentOrder,
		}
	}

	return snap
}

// Close shuts down all bots
func (c *Controller) Close() {
	c.mu.Lock()
	c.closed = true
	bots := make([]*Bot, len(c.bots))
	copy(bots, c.bots)
	c.mu.Unlock()

	for _, bot := range bots {
		bot.cancel()
		<-bot.done
	}
}

// PrintStatus prints current system status
func (c *Controller) PrintStatus() {
	snap := c.Snapshot()

	fmt.Fprintf(c.out, "\n--- System Status ---\n")

	fmt.Fprintf(c.out, "PENDING Orders (%d):\n", len(snap.Pending))
	if len(snap.Pending) == 0 {
		fmt.Fprintf(c.out, "  (none)\n")
	} else {
		for _, order := range snap.Pending {
			fmt.Fprintf(c.out, "  %s\n", order)
		}
	}

	fmt.Fprintf(c.out, "\nCOMPLETE Orders (%d):\n", len(snap.Completed))
	if len(snap.Completed) == 0 {
		fmt.Fprintf(c.out, "  (none)\n")
	} else {
		for _, order := range snap.Completed {
			fmt.Fprintf(c.out, "  %s\n", order)
		}
	}

	fmt.Fprintf(c.out, "\nBots (%d):\n", len(snap.Bots))
	if len(snap.Bots) == 0 {
		fmt.Fprintf(c.out, "  (none)\n")
	} else {
		for _, bot := range snap.Bots {
			if bot.CurrentOrder != nil {
				fmt.Fprintf(c.out, "  bot #%d (PROCESSING %s)\n", bot.ID, bot.CurrentOrder)
			} else {
				fmt.Fprintf(c.out, "  bot #%d (IDLE)\n", bot.ID)
			}
		}
	}
	fmt.Fprintf(c.out, "--------------------\n\n")
}
