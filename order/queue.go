package order

import (
	"sync"
)

// syncMu - a mutex to protect concurrent access to Pending and Completed
type Queue struct {
	Pending   []*Order
	Completed []*Order
	syncMu    sync.Mutex
}

// Returns a new instance of Queue with empty slices and a mutex.
func NewQueue() *Queue {
	return &Queue{}
}

func (que *Queue) AddOrder(o *Order) {
	// Locks the queue to prevent race conditions while modifying Pending.
	que.syncMu.Lock()
	defer que.syncMu.Unlock()

	if o.Type == VIP {
		i := 0
		// Inserts the VIP order at that position so it goes behind existing VIPs but ahead of normals
		for i < len(que.Pending) && que.Pending[i].Type == VIP {
			i++
		}
		que.Pending = append(que.Pending[:i], append([]*Order{o}, que.Pending[i:]...)...)
	} else {
		// Appends it to the end of the Pending queue
		que.Pending = append(que.Pending, o)
	}
}

// If no pending orders, returns nil.
// Otherwise, removes and returns the first order in the queue (FIFO)
func (que *Queue) PopOrder() *Order {
	que.syncMu.Lock()
	defer que.syncMu.Unlock()

	if len(que.Pending) == 0 {
		return nil
	}
	order := que.Pending[0]
	que.Pending = que.Pending[1:]
	return order
}

// Re-adds an order to the queue using the same logic as AddOrder
func (que *Queue) ReQueueOrder(o *Order) {
	que.AddOrder(o)
}

// Appends the processed order to the Completed slice.
func (que *Queue) CompleteOrder(o *Order) {
	que.syncMu.Lock()
	defer que.syncMu.Unlock()
	que.Completed = append(que.Completed, o)
}
