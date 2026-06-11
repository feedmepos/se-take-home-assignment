package controller

// PriorityQueue keeps orders in [VIP..., Normal...] arrangement:
// every VIP order is ahead of every Normal order, and orders of the
// same type preserve FIFO arrival. It is a pure data structure —
// synchronization is the caller's (Controller's) responsibility.
type PriorityQueue struct {
	items []*Order
	vips  int // number of VIP orders at the front of items
}

func NewPriorityQueue() *PriorityQueue {
	return &PriorityQueue{}
}

// Enqueue appends a Normal order to the tail, or inserts a VIP order
// right after the last queued VIP (i.e. before the first Normal).
func (q *PriorityQueue) Enqueue(o *Order) {
	if o.Type == VIP {
		q.items = append(q.items, nil)
		copy(q.items[q.vips+1:], q.items[q.vips:])
		q.items[q.vips] = o
		q.vips++
		return
	}
	q.items = append(q.items, o)
}

// Dequeue pops the highest-priority order, or nil when empty.
func (q *PriorityQueue) Dequeue() *Order {
	if len(q.items) == 0 {
		return nil
	}
	o := q.items[0]
	q.items[0] = nil // avoid retaining the popped order
	q.items = q.items[1:]
	if o.Type == VIP {
		q.vips--
	}
	return o
}

func (q *PriorityQueue) Len() int {
	return len(q.items)
}

// Snapshot returns a copy of the current queue contents for reporting.
func (q *PriorityQueue) Snapshot() []*Order {
	out := make([]*Order, len(q.items))
	copy(out, q.items)
	return out
}
