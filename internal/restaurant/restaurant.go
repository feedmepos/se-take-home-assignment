package restaurant

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Kind classifies customer orders for queue priority.
type Kind int

const (
	Normal Kind = iota
	VIP
)

// Order is a single kitchen ticket with a monotonically assigned ID.
type Order struct {
	ID   int
	Kind Kind
}

func (o Order) String() string {
	switch o.Kind {
	case VIP:
		return fmt.Sprintf("VIP#%d", o.ID)
	default:
		return fmt.Sprintf("N#%d", o.ID)
	}
}

// Restaurant coordinates pending queues, completions, and bot workers.
type Restaurant struct {
	mu sync.Mutex
	// VIP FIFO then Normal FIFO in pending display / dequeue order.
	vip, normal []Order
	completed   []Order

	nextOrderID int
	processDur  time.Duration

	cond *sync.Cond

	bots      map[int]context.CancelFunc
	nextBotID int
}

// New creates a restaurant with the given per-order processing duration.
func New(processDur time.Duration) *Restaurant {
	r := &Restaurant{
		processDur: processDur,
		bots:       make(map[int]context.CancelFunc),
	}
	r.cond = sync.NewCond(&r.mu)
	return r
}

// ProcessDuration returns configured cook time per order.
func (r *Restaurant) ProcessDuration() time.Duration {
	return r.processDur
}

// PendingSnapshot returns VIP orders followed by normal orders (read under lock for tests).
func (r *Restaurant) PendingSnapshot() []Order {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Order, 0, len(r.vip)+len(r.normal))
	out = append(out, r.vip...)
	out = append(out, r.normal...)
	return out
}

// CompletedSnapshot returns finished orders in completion order.
func (r *Restaurant) CompletedSnapshot() []Order {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Order, len(r.completed))
	copy(out, r.completed)
	return out
}

// BotCount returns active bots.
func (r *Restaurant) BotCount() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.bots)
}

// NewNormalOrder adds a normal customer order (FIFO within normal, after all VIP).
func (r *Restaurant) NewNormalOrder() Order {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.nextOrderID++
	o := Order{ID: r.nextOrderID, Kind: Normal}
	r.normal = append(r.normal, o)
	r.cond.Broadcast()
	return o
}

// NewVIPOrder queues behind existing VIP orders but ahead of all normal orders.
func (r *Restaurant) NewVIPOrder() Order {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.nextOrderID++
	o := Order{ID: r.nextOrderID, Kind: VIP}
	r.vip = append(r.vip, o)
	r.cond.Broadcast()
	return o
}

func (r *Restaurant) dequeueLocked() *Order {
	if len(r.vip) > 0 {
		o := r.vip[0]
		r.vip = r.vip[1:]
		return &o
	}
	if len(r.normal) > 0 {
		o := r.normal[0]
		r.normal = r.normal[1:]
		return &o
	}
	return nil
}

// requeueInterrupted puts an order back at the front of its tier (it was head when picked up).
func (r *Restaurant) requeueInterruptedLocked(o Order) {
	if o.Kind == VIP {
		r.vip = append([]Order{o}, r.vip...)
	} else {
		r.normal = append([]Order{o}, r.normal...)
	}
	r.cond.Broadcast()
}

func (r *Restaurant) completeLocked(o Order) {
	r.completed = append(r.completed, o)
	r.cond.Broadcast()
}

// AddBot starts a new cooking bot (picks up work immediately if pending orders exist).
func (r *Restaurant) AddBot() int {
	r.mu.Lock()
	r.nextBotID++
	id := r.nextBotID
	ctx, cancel := context.WithCancel(context.Background())
	r.bots[id] = cancel
	r.mu.Unlock()

	go r.workerLoop(ctx, id)
	return id
}

// RemoveNewestBot destroys the most recently created bot. If it was cooking, the order
// returns to the front of its VIP or normal queue.
func (r *Restaurant) RemoveNewestBot() (removedID int, ok bool) {
	r.mu.Lock()
	if len(r.bots) == 0 {
		r.mu.Unlock()
		return 0, false
	}
	newest := 0
	for id := range r.bots {
		if id > newest {
			newest = id
		}
	}
	cancel := r.bots[newest]
	delete(r.bots, newest)
	r.cond.Broadcast()
	r.mu.Unlock()

	cancel()

	return newest, true
}

func (r *Restaurant) workerLoop(ctx context.Context, id int) {
	_ = id
	for {
		var ord *Order
		r.mu.Lock()
		for {
			if ctx.Err() != nil {
				r.mu.Unlock()
				return
			}
			ord = r.dequeueLocked()
			if ord != nil {
				break
			}
			r.cond.Wait()
		}
		o := *ord
		r.mu.Unlock()

		timer := time.NewTimer(r.processDur)
		select {
		case <-timer.C:
			r.mu.Lock()
			r.completeLocked(o)
			r.mu.Unlock()
		case <-ctx.Done():
			if !timer.Stop() {
				<-timer.C
			}
			r.mu.Lock()
			r.requeueInterruptedLocked(o)
			r.mu.Unlock()
			return
		}
	}
}

// Close cancels all bots (for clean test shutdown).
func (r *Restaurant) Close() {
	r.mu.Lock()
	for id, c := range r.bots {
		delete(r.bots, id)
		c()
	}
	r.cond.Broadcast()
	r.mu.Unlock()
}
