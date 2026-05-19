package controller

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"mcd-order-controller/internal/order"
)

// Config tunes the controller. ProcessTime defaults to 10s when zero, matching
// the spec; tests and CI simulations pass a smaller value.
type Config struct {
	ProcessTime time.Duration
	Now         func() time.Time
	Logger      *Logger
}

type Controller struct {
	procTime time.Duration
	now      func() time.Time
	log      *Logger

	mu        sync.Mutex
	pending   *order.Queue
	completed []*order.Order
	bots      []*Bot
	nextOrder int
	nextBot   int

	wg sync.WaitGroup
}

func New(cfg Config) *Controller {
	if cfg.ProcessTime <= 0 {
		cfg.ProcessTime = 10 * time.Second
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	c := &Controller{
		procTime:  cfg.ProcessTime,
		now:       cfg.Now,
		log:       cfg.Logger,
		pending:   order.NewQueue(),
		nextOrder: 1000,
	}
	c.logf("System initialized with 0 bots (processing time: %s)", c.procTime)
	return c
}

// SubmitOrder enqueues a new order and wakes any idle bot. The returned order
// is a snapshot; callers should not mutate it.
func (c *Controller) SubmitOrder(t order.Type) *order.Order {
	c.mu.Lock()
	c.nextOrder++
	o := order.New(c.nextOrder, t, c.now())
	c.pending.Push(o)
	bots := append([]*Bot(nil), c.bots...)
	c.mu.Unlock()

	c.logf("Created %s Order #%d - Status: PENDING", t, o.ID)

	for _, b := range bots {
		b.notify()
	}
	return o
}

// AddBot creates a new bot, spawns its processing goroutine, and immediately
// signals it so it can pick up any pending order.
func (c *Controller) AddBot() *Bot {
	ctx, cancel := context.WithCancel(context.Background())

	c.mu.Lock()
	c.nextBot++
	b := newBot(c.nextBot, cancel)
	c.bots = append(c.bots, b)
	c.mu.Unlock()

	c.logf("Bot #%d created - Status: ACTIVE", b.ID)

	c.wg.Add(1)
	go c.runBot(ctx, b)

	b.notify()
	return b
}

// RemoveBot destroys the newest bot. If it was processing an order, that
// order is returned to the head of its priority class in PENDING. Returns the
// removed bot (or an error if there are no bots).
func (c *Controller) RemoveBot() (*Bot, error) {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return nil, errors.New("no bots to remove")
	}
	last := len(c.bots) - 1
	b := c.bots[last]
	c.bots = c.bots[:last]
	c.mu.Unlock()

	b.cancel()
	<-b.done
	return b, nil
}

func (c *Controller) runBot(ctx context.Context, b *Bot) {
	defer c.wg.Done()
	defer close(b.done)

	loggedIdle := false
	for {
		c.mu.Lock()
		o := c.pending.Pop()
		c.mu.Unlock()

		if o == nil {
			if !loggedIdle {
				c.logf("Bot #%d is now IDLE - No pending orders", b.ID)
				loggedIdle = true
			}
			select {
			case <-ctx.Done():
				c.logf("Bot #%d destroyed while IDLE", b.ID)
				return
			case <-b.wake:
				continue
			}
		}

		loggedIdle = false
		b.setProcessing(o)
		o.Status = order.StatusProcessing
		c.logf("Bot #%d picked up %s Order #%d - Status: PROCESSING", b.ID, o.Type, o.ID)

		timer := time.NewTimer(c.procTime)
		select {
		case <-ctx.Done():
			timer.Stop()
			o.Status = order.StatusPending
			c.mu.Lock()
			c.pending.PushFront(o)
			c.mu.Unlock()
			b.setIdle()
			c.logf("Bot #%d destroyed - %s Order #%d returned to PENDING", b.ID, o.Type, o.ID)

			c.mu.Lock()
			remaining := append([]*Bot(nil), c.bots...)
			c.mu.Unlock()
			for _, other := range remaining {
				other.notify()
			}
			return

		case <-timer.C:
			o.Status = order.StatusComplete
			c.mu.Lock()
			c.completed = append(c.completed, o)
			c.mu.Unlock()
			b.setIdle()
			c.logf("Bot #%d completed %s Order #%d - Status: COMPLETE (processing time: %s)",
				b.ID, o.Type, o.ID, c.procTime)
		}
	}
}

// Snapshot returns a point-in-time view of the system, safe to render or log.
type Snapshot struct {
	Pending   []*order.Order
	Completed []*order.Order
	Bots      []BotSnapshot
}

type BotSnapshot struct {
	ID      int
	Status  BotStatus
	Current *order.Order
}

func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	pending := c.pending.Snapshot()
	completed := append([]*order.Order(nil), c.completed...)
	bots := make([]BotSnapshot, 0, len(c.bots))
	for _, b := range c.bots {
		st, cur := b.Snapshot()
		bots = append(bots, BotSnapshot{ID: b.ID, Status: st, Current: cur})
	}
	c.mu.Unlock()
	return Snapshot{Pending: pending, Completed: completed, Bots: bots}
}

// Shutdown cancels every bot and waits for them to finish. Pending orders
// are left in the queue; the caller can inspect them via Snapshot.
func (c *Controller) Shutdown() {
	c.mu.Lock()
	bots := append([]*Bot(nil), c.bots...)
	c.bots = nil
	c.mu.Unlock()

	for _, b := range bots {
		b.cancel()
	}
	c.wg.Wait()
}

func (c *Controller) logf(format string, args ...any) {
	if c.log == nil {
		return
	}
	c.log.Logf(format, args...)
}

// FormatSnapshot is a convenience used by both the CLI status command and the
// simulation output.
func FormatSnapshot(s Snapshot) string {
	out := "--- Status ---\n"
	out += fmt.Sprintf("Bots (%d):\n", len(s.Bots))
	if len(s.Bots) == 0 {
		out += "  (none)\n"
	}
	for _, b := range s.Bots {
		if b.Current != nil {
			out += fmt.Sprintf("  Bot #%d - %s - %s Order #%d\n", b.ID, b.Status, b.Current.Type, b.Current.ID)
		} else {
			out += fmt.Sprintf("  Bot #%d - %s\n", b.ID, b.Status)
		}
	}
	out += fmt.Sprintf("Pending (%d):\n", len(s.Pending))
	if len(s.Pending) == 0 {
		out += "  (none)\n"
	}
	for _, o := range s.Pending {
		out += fmt.Sprintf("  %s Order #%d\n", o.Type, o.ID)
	}
	out += fmt.Sprintf("Completed (%d):\n", len(s.Completed))
	for _, o := range s.Completed {
		out += fmt.Sprintf("  %s Order #%d\n", o.Type, o.ID)
	}
	return out
}
