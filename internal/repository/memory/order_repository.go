package memory

import (
	"sync"

	"feedme-order-controller/internal/core"
	"feedme-order-controller/internal/repository/entity"
	"feedme-order-controller/pkg/idgen"
	"feedme-order-controller/pkg/queue"
)

// orderLess is the priority comparator for the pending queue: VIP orders are
// served before Normal orders (entity.OrderEntity.Kind mirrors
// core.OrderKind's numeric values, where higher means higher priority);
// within the same kind, lower IDs (older orders) are served first.
func orderLess(a, b entity.OrderEntity) bool {
	if a.Kind != b.Kind {
		return a.Kind > b.Kind // higher kind (VIP) first
	}
	return a.ID < b.ID
}

// OrderRepository is an in-memory, thread-safe store for pending and
// completed orders. It is the usecase layer's port for order persistence
// and blocking dequeue.
type OrderRepository struct {
	mu   sync.Mutex
	cond *sync.Cond

	seq     *idgen.Sequence
	pending *queue.PriorityQueue[entity.OrderEntity]

	// Completed orders are never read back individually — every consumer
	// (status render, final summary) needs only the counts — so instead of
	// an unboundedly growing slice we keep running counters, updated in
	// Complete. This makes CompletedCounts O(1) and memory O(1).
	completedTotal  int
	completedVIP    int
	completedNormal int
}

// NewOrderRepository creates an empty OrderRepository with its ID sequence
// starting at 1.
func NewOrderRepository() *OrderRepository {
	r := &OrderRepository{
		seq:     idgen.NewSequence(1),
		pending: queue.New(orderLess),
	}
	r.cond = sync.NewCond(&r.mu)
	return r
}

// NextOrderID returns the next strictly-increasing order ID.
func (r *OrderRepository) NextOrderID() int {
	return r.seq.Next()
}

// Enqueue adds order o to the pending queue and wakes any bot blocked in
// Dequeue.
func (r *OrderRepository) Enqueue(o core.Order) {
	r.mu.Lock()
	r.pending.Push(toEntity(o))
	r.mu.Unlock()
	r.cond.Broadcast()
}

// Dequeue blocks until an order is available or stop is closed. On success
// it returns the highest-priority pending order with Status set to
// Processing and ok=true. If stop is closed (before or while waiting) it
// returns a zero Order and ok=false.
func (r *OrderRepository) Dequeue(stop <-chan struct{}) (core.Order, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for {
		// Non-blocking check of stop before waiting.
		select {
		case <-stop:
			return core.Order{}, false
		default:
		}

		if e, ok := r.pending.Pop(); ok {
			o := toCore(e)
			o.Status = core.StatusProcessing
			return o, true
		}

		// Queue is empty: wait to be woken by Enqueue/Requeue/WakeAll, then
		// re-check stop and the queue.
		r.cond.Wait()

		select {
		case <-stop:
			return core.Order{}, false
		default:
		}
	}
}

// Requeue puts an in-flight order back into the pending queue. Because
// order IDs are strictly increasing and never reissued (see idgen.Sequence),
// pushing the same entity.OrderEntity{ID, Kind} back into the priority queue
// reproduces its original relative position among the other pending orders:
// same-kind ordering is by ID ascending, so a requeued order slots back in
// exactly where it would have been had it never been dequeued.
func (r *OrderRepository) Requeue(o core.Order) {
	r.mu.Lock()
	r.pending.Push(toEntity(o))
	r.mu.Unlock()
	r.cond.Broadcast()
}

// Complete records o as completed and returns a copy with Status=Complete.
func (r *OrderRepository) Complete(o core.Order) core.Order {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.completedTotal++
	if o.Kind == core.KindVIP {
		r.completedVIP++
	} else {
		r.completedNormal++
	}
	done := o
	done.Status = core.StatusComplete
	return done
}

// WakeAll wakes all goroutines blocked in Dequeue so they can re-check their
// stop channel. Used when a bot is being stopped so a blocked Dequeue
// promptly notices.
func (r *OrderRepository) WakeAll() {
	r.cond.Broadcast()
}

// PendingSnapshot returns a snapshot of pending orders in priority order,
// each with Status=Pending.
func (r *OrderRepository) PendingSnapshot() []core.Order {
	r.mu.Lock()
	defer r.mu.Unlock()
	items := r.pending.Items()
	out := make([]core.Order, 0, len(items))
	for _, e := range items {
		out = append(out, toCore(e))
	}
	return out
}

// CompletedCounts returns the number of completed orders, in total and
// broken down by kind.
func (r *OrderRepository) CompletedCounts() (total, vip, normal int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.completedTotal, r.completedVIP, r.completedNormal
}

// PendingLen returns the number of orders currently pending.
func (r *OrderRepository) PendingLen() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.pending.Len()
}
