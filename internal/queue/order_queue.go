package queue

import (
	"sync"
	"github.com/hwakman/se-take-home-assignment/internal/domain"
)

// OrderQueue is a thread-safe priority queue for orders
type OrderQueue struct {
	mu     sync.Mutex
	orders []*domain.Order
}

func NewOrderQueue() *OrderQueue {
	return &OrderQueue{
		orders: make([]*domain.Order, 0),
	}
}

// Push adds an order to the queue, ensuring VIP orders jump ahead of Normal ones
func (q *OrderQueue) Push(order *domain.Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if order.OrderType == domain.OrderTypeNormal {
		q.orders = append(q.orders, order)
		return
	}

	// For VIP: find the position of the last VIP order
	insertIdx := 0
	for i, existing := range q.orders {
		if existing.OrderType == domain.OrderTypeVIP {
			insertIdx = i + 1
		} else {
			// Once we hit a non-VIP, we stop looking if we want to stay behind previous VIPs
			// but ahead of all normals.
			break
		}
	}

	// Insert at insertIdx
	q.orders = append(q.orders, nil) // extend
	copy(q.orders[insertIdx+1:], q.orders[insertIdx:])
	q.orders[insertIdx] = order
}

// Pop removes and returns the first order in the queue (highest priority)
func (q *OrderQueue) Pop() *domain.Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.orders) == 0 {
		return nil
	}

	order := q.orders[0]
	q.orders = q.orders[1:]
	return order
}

func (q *OrderQueue) Remove(orderID int) bool {
	q.mu.Lock()
	defer q.mu.Unlock()

	for i, o := range q.orders {
		if o.ID == orderID {
			q.orders = append(q.orders[:i], q.orders[i+1:]...)
			return true
		}
	}
	return false
}

func (q *OrderQueue) GetAll() []*domain.Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	
	copy := make([]*domain.Order, len(q.orders))
	for i, o := range q.orders {
		copy[i] = o
	}
	return copy
}

func (q *OrderQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.orders)
}
