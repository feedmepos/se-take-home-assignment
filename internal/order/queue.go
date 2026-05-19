package order

// Queue is a two-class FIFO queue. VIP orders are always served before
// Normal orders, and within each class orders are served in arrival order.
//
// PushFront is used when a bot is destroyed mid-process: the order goes back
// to the head of its own class, preserving the original VIP/Normal ordering.
type Queue struct {
	vip    []*Order
	normal []*Order
}

func NewQueue() *Queue {
	return &Queue{}
}

func (q *Queue) Push(o *Order) {
	if o == nil {
		return
	}
	if o.Type == VIP {
		q.vip = append(q.vip, o)
		return
	}
	q.normal = append(q.normal, o)
}

func (q *Queue) PushFront(o *Order) {
	if o == nil {
		return
	}
	if o.Type == VIP {
		q.vip = append([]*Order{o}, q.vip...)
		return
	}
	q.normal = append([]*Order{o}, q.normal...)
}

func (q *Queue) Pop() *Order {
	if len(q.vip) > 0 {
		o := q.vip[0]
		q.vip = q.vip[1:]
		return o
	}
	if len(q.normal) > 0 {
		o := q.normal[0]
		q.normal = q.normal[1:]
		return o
	}
	return nil
}

func (q *Queue) Len() int {
	return len(q.vip) + len(q.normal)
}

func (q *Queue) Snapshot() []*Order {
	out := make([]*Order, 0, q.Len())
	out = append(out, q.vip...)
	out = append(out, q.normal...)
	return out
}
