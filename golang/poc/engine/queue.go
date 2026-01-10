package engine

import "sync"

// OrderQueue maintains VIP ahead of Normal, FIFO within each group.
type OrderQueue struct {
	mu      sync.Mutex
	vips    []Order
	normals []Order
}

func NewOrderQueue() *OrderQueue {
	return &OrderQueue{
		vips:    make([]Order, 0),
		normals: make([]Order, 0),
	}
}

func (q *OrderQueue) Enqueue(o Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if o.Privilege == VIP {
		q.vips = append(q.vips, o)
		return
	}
	q.normals = append(q.normals, o)
}

func (q *OrderQueue) Dequeue() (Order, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.vips) > 0 {
		o := q.vips[0]
		q.vips = q.vips[1:]
		return o, true
	}
	if len(q.normals) > 0 {
		o := q.normals[0]
		q.normals = q.normals[1:]
		return o, true
	}
	return Order{}, false
}

func (q *OrderQueue) PendingCount() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.vips) + len(q.normals)
}

func (q *OrderQueue) SnapshotPendingIDs() []int {
	q.mu.Lock()
	defer q.mu.Unlock()

	out := make([]int, 0, len(q.vips)+len(q.normals))
	for _, o := range q.vips {
		out = append(out, o.ID)
	}
	for _, o := range q.normals {
		out = append(out, o.ID)
	}
	return out
}
