package internal

// Queue maintains VIP orders before NORMAL orders, FIFO within each group.
type Queue struct {
	vip    []*Order
	normal []*Order
}

// Push appends the order to the end of its group (VIP or NORMAL).
func (q *Queue) Push(o *Order) {
	if o.Type == VIP {
		q.vip = append(q.vip, o)
	} else {
		q.normal = append(q.normal, o)
	}
}

// PushByID re-inserts an order sorted by ID ascending within its group.
// Used when returning an order to the queue after bot removal.
func (q *Queue) PushByID(o *Order) {
	if o.Type == VIP {
		q.vip = insertSorted(q.vip, o)
	} else {
		q.normal = insertSorted(q.normal, o)
	}
}

func insertSorted(orders []*Order, o *Order) []*Order {
	i := 0
	for i < len(orders) && orders[i].ID < o.ID {
		i++
	}
	orders = append(orders, nil)
	copy(orders[i+1:], orders[i:])
	orders[i] = o
	return orders
}

// Pop removes and returns the next order: VIP first, then NORMAL.
func (q *Queue) Pop() *Order {
	if len(q.vip) > 0 {
		o := q.vip[0]
		q.vip[0] = nil // avoid holding reference to popped element
		q.vip = q.vip[1:]
		return o
	}
	if len(q.normal) > 0 {
		o := q.normal[0]
		q.normal[0] = nil
		q.normal = q.normal[1:]
		return o
	}
	return nil
}

// PeekIDs returns the IDs of all pending orders in processing order.
func (q *Queue) PeekIDs() []int {
	ids := make([]int, 0, q.Len())
	for _, o := range q.vip {
		ids = append(ids, o.ID)
	}
	for _, o := range q.normal {
		ids = append(ids, o.ID)
	}
	return ids
}

// Len returns the total number of pending orders.
func (q *Queue) Len() int {
	return len(q.vip) + len(q.normal)
}
