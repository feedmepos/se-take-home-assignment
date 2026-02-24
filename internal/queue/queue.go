package queue

import (
	"sync"

	"github.com/dnisting/se-take-home-assignment/internal/models"
)

// OrderQueue is a thread-safe priority queue where VIP orders
// are placed ahead of Normal orders but behind existing VIP orders.
type OrderQueue struct {
	mu     sync.Mutex
	orders []*models.Order
}

// NewOrderQueue creates a new empty OrderQueue.
func NewOrderQueue() *OrderQueue {
	return &OrderQueue{}
}

// Enqueue adds an order to the queue with VIP priority insertion.
// VIP orders are inserted after existing VIP orders but before Normal orders.
// Normal orders are appended to the end.
func (q *OrderQueue) Enqueue(o *models.Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if o.Type == models.OrderTypeVIP {
		insertIdx := 0
		for i, existing := range q.orders {
			if existing.Type == models.OrderTypeVIP {
				insertIdx = i + 1
			} else {
				break
			}
		}
		q.orders = append(q.orders, nil)
		copy(q.orders[insertIdx+1:], q.orders[insertIdx:])
		q.orders[insertIdx] = o
	} else {
		q.orders = append(q.orders, o)
	}
}

// EnqueueFront places an order at the front of the queue.
// Used when a bot is removed and its in-progress order needs to return to PENDING.
func (q *OrderQueue) EnqueueFront(o *models.Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	q.orders = append([]*models.Order{o}, q.orders...)
}

// Dequeue removes and returns the first order from the queue.
// Returns nil if the queue is empty.
func (q *OrderQueue) Dequeue() *models.Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.orders) == 0 {
		return nil
	}

	o := q.orders[0]
	q.orders = q.orders[1:]
	return o
}

// Len returns the number of orders in the queue.
func (q *OrderQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()

	return len(q.orders)
}

// PendingOrders returns a snapshot of all orders currently in the queue.
func (q *OrderQueue) PendingOrders() []*models.Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	snapshot := make([]*models.Order, len(q.orders))
	copy(snapshot, q.orders)
	return snapshot
}
