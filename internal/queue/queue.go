package queue

import (
	"mcdonalds-order-system/internal/model"
	"sync"
)

// OrderQueue is a priority queue where VIP orders are processed before Normal orders
type OrderQueue struct {
	orders []*model.Order
	mu     sync.Mutex
}

func NewOrderQueue() *OrderQueue {
	return &OrderQueue{
		orders: make([]*model.Order, 0),
	}
}

// Enqueue adds an order to the queue
// VIP orders are placed after all existing VIP orders but before all Normal orders
func (q *OrderQueue) Enqueue(order *model.Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if order.Type == model.OrderTypeVIP {
		// Find the position after last VIP order
		insertPos := 0
		for i, o := range q.orders {
			if o.Type == model.OrderTypeVIP {
				insertPos = i + 1
			} else {
				break
			}
		}
		// Insert at position
		q.orders = append(q.orders[:insertPos], append([]*model.Order{order}, q.orders[insertPos:]...)...)
	} else {
		// Normal orders go to the end
		q.orders = append(q.orders, order)
	}
}

// EnqueueFront adds an order to the front of the queue (used when bot is destroyed)
func (q *OrderQueue) EnqueueFront(order *model.Order) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.orders = append([]*model.Order{order}, q.orders...)
}

// Dequeue removes and returns the first order in the queue
func (q *OrderQueue) Dequeue() *model.Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.orders) == 0 {
		return nil
	}

	order := q.orders[0]
	q.orders = q.orders[1:]
	return order
}

// Peek returns the first order without removing it
func (q *OrderQueue) Peek() *model.Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.orders) == 0 {
		return nil
	}
	return q.orders[0]
}

// Size returns the number of orders in the queue
func (q *OrderQueue) Size() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.orders)
}

// IsEmpty returns true if the queue is empty
func (q *OrderQueue) IsEmpty() bool {
	return q.Size() == 0
}

// GetAll returns a copy of all orders (for display purposes)
func (q *OrderQueue) GetAll() []*model.Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	result := make([]*model.Order, len(q.orders))
	copy(result, q.orders)
	return result
}
