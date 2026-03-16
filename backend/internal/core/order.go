package core

import (
	"sync"
	"time"
)

type OrderType int

const (
	Normal OrderType = iota
	VIP
)

func (t OrderType) String() string {
	if t == VIP {
		return "VIP"
	}
	return "Normal"
}

type OrderStatus int

const (
	Pending OrderStatus = iota
	Processing
	Complete
)

func (s OrderStatus) String() string {
	switch s {
	case Processing:
		return "PROCESSING"
	case Complete:
		return "COMPLETE"
	default:
		return "PENDING"
	}
}

type Order struct {
	ID        int         `json:"id"`
	Type      OrderType   `json:"type"`
	Status    OrderStatus `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
}

type OrderQueue struct {
	mu     sync.Mutex
	orders []*Order
	nextID int
}

func NewOrderQueue() *OrderQueue {
	return &OrderQueue{nextID: 1}
}

func (q *OrderQueue) Add(orderType OrderType) *Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	o := &Order{
		ID:        q.nextID,
		Type:      orderType,
		Status:    Pending,
		CreatedAt: time.Now(),
	}
	q.nextID++

	if orderType == VIP {
		// Insert after last VIP
		insertAt := 0
		for i, existing := range q.orders {
			if existing.Type == VIP {
				insertAt = i + 1
			}
		}
		q.orders = append(q.orders, nil)
		copy(q.orders[insertAt+1:], q.orders[insertAt:])
		q.orders[insertAt] = o
	} else {
		q.orders = append(q.orders, o)
	}

	return o
}

func (q *OrderQueue) Dequeue() *Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.orders) == 0 {
		return nil
	}
	o := q.orders[0]
	q.orders = q.orders[1:]
	return o
}

func (q *OrderQueue) Return(o *Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	o.Status = Pending

	if o.Type == VIP {
		insertAt := 0
		for i, existing := range q.orders {
			if existing.Type == VIP {
				insertAt = i + 1
			}
		}
		q.orders = append(q.orders, nil)
		copy(q.orders[insertAt+1:], q.orders[insertAt:])
		q.orders[insertAt] = o
	} else {
		q.orders = append(q.orders, o)
	}
}

func (q *OrderQueue) Pending() []*Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	result := make([]*Order, len(q.orders))
	copy(result, q.orders)
	return result
}

func (q *OrderQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.orders)
}
