package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/KhanitthaK/feedme-backend-service/internal/domain"
)

// DefaultProcessDuration is the real McDonald's cooking time. It is injectable
// via NewOrderController so tests can use a short deterministic duration.
const DefaultProcessDuration = 10 * time.Second

// ErrNoBots is returned by RemoveBot when there are no bots to remove.
var ErrNoBots = errors.New("no bots to remove")

// botHandle bundles a domain Bot with the goroutine machinery that drives it.
type botHandle struct {
	bot       *domain.Bot
	cancel    context.CancelFunc
	done      chan struct{} // closed when the bot goroutine has fully exited
	startedAt time.Time     // when the current order began processing (PROCESSING only)
}

// OrderController owns ALL state and business rules. Every mutation goes
// through a mutex-guarded method, so HTTP handlers and bot goroutines are safe
// to call it concurrently. Idle bots block on a sync.Cond instead of
// busy-looping and are woken when a new order arrives.
type OrderController struct {
	mu   sync.Mutex
	cond *sync.Cond

	clock   Clock
	procDur time.Duration

	orderSeq int // single ever-increasing order id counter, never reused
	botSeq   int // single ever-increasing bot id counter

	pending    []*domain.Order        // ordered queue: VIP block first, then NORMAL block
	processing map[int]*domain.Order  // orderID -> order currently held by a bot
	complete   []*domain.Order        // completed orders, oldest first
	bots       []*botHandle           // ordered by id asc (append order); newest is last
}

// NewOrderController builds a controller. A nil clock defaults to the real
// clock; a non-positive procDur defaults to DefaultProcessDuration.
func NewOrderController(clock Clock, procDur time.Duration) *OrderController {
	if clock == nil {
		clock = NewRealClock()
	}
	if procDur <= 0 {
		procDur = DefaultProcessDuration
	}
	c := &OrderController{
		clock:      clock,
		procDur:    procDur,
		processing: make(map[int]*domain.Order),
	}
	c.cond = sync.NewCond(&c.mu)
	return c
}

// CreateOrder adds a new order at its correct priority position and wakes any
// idle bot. It returns a snapshot of the created order.
func (c *OrderController) CreateOrder(t domain.OrderType) (domain.Order, error) {
	if !t.Valid() {
		return domain.Order{}, fmt.Errorf("invalid order type: %q", t)
	}
	c.mu.Lock()
	c.orderSeq++
	o := &domain.Order{
		ID:        c.orderSeq,
		Type:      t,
		Status:    domain.OrderStatusPending,
		CreatedAt: c.clock.Now(),
	}
	c.insertPendingLocked(o)
	c.cond.Broadcast() // wake an idle bot to pick this up
	snapshot := *o
	c.mu.Unlock()
	return snapshot, nil
}

// insertPendingLocked inserts o into the pending queue maintaining the
// invariant "all VIP orders before all NORMAL orders". A VIP is placed AFTER
// existing VIPs but BEFORE the first NORMAL; a NORMAL is appended to the end.
// The caller must hold c.mu.
func (c *OrderController) insertPendingLocked(o *domain.Order) {
	if o.Type == domain.OrderTypeVIP {
		// Find the first NORMAL (== index just past the last VIP).
		i := 0
		for i < len(c.pending) && c.pending[i].Type == domain.OrderTypeVIP {
			i++
		}
		c.pending = append(c.pending, nil)
		copy(c.pending[i+1:], c.pending[i:])
		c.pending[i] = o
		return
	}
	c.pending = append(c.pending, o)
}

// AddBot creates a bot that immediately starts processing the front of the
// pending queue if any, otherwise idles until an order arrives.
func (c *OrderController) AddBot() domain.Bot {
	c.mu.Lock()
	c.botSeq++
	ctx, cancel := context.WithCancel(context.Background())
	bh := &botHandle{
		bot:    &domain.Bot{ID: c.botSeq, Status: domain.BotStatusIdle},
		cancel: cancel,
		done:   make(chan struct{}),
	}
	c.bots = append(c.bots, bh)
	snapshot := *bh.bot
	c.mu.Unlock()

	go c.runBot(ctx, bh)
	return snapshot
}

// RemoveBot destroys the NEWEST bot (highest id). If it was processing an
// order, that processing is stopped and the order is returned to the pending
// queue at its correct priority position (status PENDING). Never loses an
// order. Returns the removed bot id, or ErrNoBots if there are none.
func (c *OrderController) RemoveBot() (int, error) {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return 0, ErrNoBots
	}
	last := len(c.bots) - 1
	bh := c.bots[last]
	c.bots = c.bots[:last]
	removedID := bh.bot.ID
	bh.cancel()        // signal the goroutine to stop (requeue if mid-order)
	c.cond.Broadcast() // wake it if it is idle-waiting on the cond
	c.mu.Unlock()

	<-bh.done // wait for the goroutine to finish its requeue/cleanup
	return removedID, nil
}

// runBot is the per-bot goroutine. It waits for work, processes one order for
// procDur, and either completes it or (on cancellation) requeues it and exits.
func (c *OrderController) runBot(ctx context.Context, bh *botHandle) {
	defer close(bh.done)

	for {
		c.mu.Lock()
		// Wait for an order or for cancellation. Signalling always happens
		// under c.mu, so no wakeups can be missed.
		for len(c.pending) == 0 && ctx.Err() == nil {
			c.cond.Wait()
		}
		if ctx.Err() != nil {
			bh.bot.Status = domain.BotStatusIdle
			bh.bot.CurrentOrderID = nil
			c.mu.Unlock()
			return
		}

		// Take the front of the queue and start processing it.
		order := c.pending[0]
		c.pending = c.pending[1:]
		order.Status = domain.OrderStatusProcessing
		c.processing[order.ID] = order
		bh.bot.Status = domain.BotStatusProcessing
		bh.bot.CurrentOrderID = &order.ID
		bh.startedAt = c.clock.Now()
		c.mu.Unlock()

		select {
		case <-c.clock.After(c.procDur):
			// Finished cooking -> COMPLETE.
			c.mu.Lock()
			delete(c.processing, order.ID)
			order.Status = domain.OrderStatusComplete
			t := c.clock.Now()
			order.CompletedAt = &t
			c.complete = append(c.complete, order)
			bh.bot.Status = domain.BotStatusIdle
			bh.bot.CurrentOrderID = nil
			c.mu.Unlock()
			// Loop back around; this bot picks the next order itself.

		case <-ctx.Done():
			// Bot removed mid-order -> return the order to pending unharmed.
			c.mu.Lock()
			delete(c.processing, order.ID)
			order.Status = domain.OrderStatusPending
			c.insertPendingLocked(order)
			bh.bot.Status = domain.BotStatusIdle
			bh.bot.CurrentOrderID = nil
			c.cond.Broadcast() // let a remaining bot pick the requeued order
			c.mu.Unlock()
			return
		}
	}
}

// Reset stops all bots and clears all state (including the id counters). Useful
// for demos. Any orders a stopped bot requeues during shutdown are cleared too.
func (c *OrderController) Reset() {
	c.mu.Lock()
	handles := c.bots
	c.bots = nil
	for _, bh := range handles {
		bh.cancel()
	}
	c.cond.Broadcast()
	c.mu.Unlock()

	for _, bh := range handles {
		<-bh.done
	}

	c.mu.Lock()
	c.pending = nil
	c.processing = make(map[int]*domain.Order)
	c.complete = nil
	c.orderSeq = 0
	c.botSeq = 0
	c.mu.Unlock()
}

// BotView is a bot snapshot enriched with best-effort remaining seconds.
type BotView struct {
	Bot              domain.Bot
	RemainingSeconds *int // nil when IDLE
}

// StateSnapshot is an immutable copy of the whole controller state.
type StateSnapshot struct {
	Pending    []domain.Order
	Processing []domain.Order
	Complete   []domain.Order
	Bots       []BotView
}

// GetState returns a consistent snapshot of the whole state. Pending is in
// queue order (VIP block first), processing is ordered by bot id, complete is
// oldest-first, bots are ordered by id asc.
func (c *OrderController) GetState() StateSnapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	s := StateSnapshot{}
	for _, o := range c.pending {
		s.Pending = append(s.Pending, *o)
	}

	now := c.clock.Now()
	for _, bh := range c.bots {
		b := *bh.bot
		if b.CurrentOrderID != nil { // detach the pointer from live state
			id := *b.CurrentOrderID
			b.CurrentOrderID = &id
		}
		bv := BotView{Bot: b}
		if bh.bot.Status == domain.BotStatusProcessing && bh.bot.CurrentOrderID != nil {
			if o, ok := c.processing[*bh.bot.CurrentOrderID]; ok {
				s.Processing = append(s.Processing, *o)
			}
			rem := c.procDur - now.Sub(bh.startedAt)
			secs := 0
			if rem > 0 {
				secs = int(math.Ceil(rem.Seconds()))
			}
			bv.RemainingSeconds = &secs
		}
		s.Bots = append(s.Bots, bv)
	}

	for _, o := range c.complete {
		s.Complete = append(s.Complete, *o)
	}
	return s
}
