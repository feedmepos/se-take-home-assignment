package controller

type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

func (t OrderType) String() string {
	if t == OrderVIP {
		return "VIP"
	}
	return "Normal"
}

type OrderStatus int

const (
	StatusPending OrderStatus = iota
	StatusProcessing
	StatusComplete
)

func (s OrderStatus) String() string {
	switch s {
	case StatusPending:
		return "PENDING"
	case StatusProcessing:
		return "PROCESSING"
	case StatusComplete:
		return "COMPLETE"
	}
	return "UNKNOWN"
}

type Order struct {
	ID     int
	Type   OrderType
	Status OrderStatus
}

type orderQueue struct {
	vip    []*Order
	normal []*Order
}

func newOrderQueue() *orderQueue {
	return &orderQueue{}
}

func (q *orderQueue) enqueue(o *Order) {
	if o.Type == OrderVIP {
		q.vip = append(q.vip, o)
		return
	}
	q.normal = append(q.normal, o)
}

func (q *orderQueue) dequeue() *Order {
	if len(q.vip) > 0 {
		head := q.vip[0]
		q.vip = q.vip[1:]
		return head
	}
	if len(q.normal) > 0 {
		head := q.normal[0]
		q.normal = q.normal[1:]
		return head
	}
	return nil
}

func (q *orderQueue) requeueFront(o *Order) {
	if o.Type == OrderVIP {
		q.vip = append([]*Order{o}, q.vip...)
		return
	}
	q.normal = append([]*Order{o}, q.normal...)
}

func (q *orderQueue) snapshot() []*Order {
	out := make([]*Order, 0, len(q.vip)+len(q.normal))
	out = append(out, q.vip...)
	out = append(out, q.normal...)
	return out
}

func (q *orderQueue) size() int {
	return len(q.vip) + len(q.normal)
}
