package order

import "sync"

// Queue is a single PENDING queue with VIP insertion priority:
// [ VIP..., Normal... ]
// Thread-safe: all methods take q.mu internally.
type Queue struct {
	mu    sync.Mutex
	items []*Order
}

func NewQueue() *Queue {
	return &Queue{items: make([]*Order, 0)}
}

func (q *Queue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.items)
}

func (q *Queue) Items() []*Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	out := make([]*Order, len(q.items))
	copy(out, q.items)
	return out
}

func (q *Queue) IDs() []int {
	q.mu.Lock()
	defer q.mu.Unlock()
	ids := make([]int, len(q.items))
	for i, o := range q.items {
		ids[i] = o.ID
	}
	return ids
}

// EnqueueNormal appends a normal order to the end.
func (q *Queue) EnqueueNormal(order *Order) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.items = append(q.items, order)
}

// EnqueueVIP inserts after existing VIP orders and before the first Normal.
func (q *Queue) EnqueueVIP(order *Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	insertIndex := 0
	for i, pending := range q.items {
		if pending.Type == Normal {
			insertIndex = i
			break
		}
		insertIndex = i + 1
	}
	q.items = append(q.items[:insertIndex], append([]*Order{order}, q.items[insertIndex:]...)...)
}

// Dequeue removes and returns the head order, or nil if empty.
func (q *Queue) Dequeue() *Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	if len(q.items) == 0 {
		return nil
	}
	order := q.items[0]
	q.items = q.items[1:]
	return order
}
