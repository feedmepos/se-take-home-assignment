package queue

import (
	"McDonald/internal/model"
)

// PriorityQueue 优先级队列
// VIP 订单排在所有普通订单之前
type PriorityQueue struct {
	orders []*model.Order
}

// NewPriorityQueue creates a new priority queue
func NewPriorityQueue() *PriorityQueue {
	return &PriorityQueue{
		orders: make([]*model.Order, 0),
	}
}

// Enqueue adds an order to the queue
// VIP orders are placed before all Normal orders
// If multiple VIP orders exist, new VIP orders go behind existing VIP orders
func (q *PriorityQueue) Enqueue(order *model.Order) {
	if order.Type == model.OrderTypeVIP {
		// Find the position of the first Normal order
		insertIdx := len(q.orders)
		for i, o := range q.orders {
			if o.Type == model.OrderTypeNormal {
				insertIdx = i
				break
			}
		}
		// Insert at insertIdx
		q.orders = append(q.orders[:insertIdx], append([]*model.Order{order}, q.orders[insertIdx:]...)...)
	} else {
		// Normal orders go to the end
		q.orders = append(q.orders, order)
	}
}

// Dequeue removes and returns the first order from the queue
func (q *PriorityQueue) Dequeue() *model.Order {
	if len(q.orders) == 0 {
		return nil
	}
	order := q.orders[0]
	q.orders = q.orders[1:]
	return order
}

// Peek returns the first order without removing it
func (q *PriorityQueue) Peek() *model.Order {
	if len(q.orders) == 0 {
		return nil
	}
	return q.orders[0]
}

// Remove removes a specific order from the queue
func (q *PriorityQueue) Remove(order *model.Order) bool {
	for i, o := range q.orders {
		if o.ID == order.ID {
			q.orders = append(q.orders[:i], q.orders[i+1:]...)
			return true
		}
	}
	return false
}

// Len returns the number of orders in the queue
func (q *PriorityQueue) Len() int {
	return len(q.orders)
}

// InsertAtEnd inserts a Normal order at the end (for returnToPending scenario)
func (q *PriorityQueue) InsertAtEnd(order *model.Order) {
	q.orders = append(q.orders, order)
}

// GetOrders returns all orders (for debugging)
func (q *PriorityQueue) GetOrders() []*model.Order {
	return q.orders
}
