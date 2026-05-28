package controller

import (
	"sort"
	"sync"
	"time"
)

type OrderType string

const (
	OrderNormal OrderType = "Normal"
	OrderVIP    OrderType = "VIP"
)

type OrderStatus string

const (
	StatusPending    OrderStatus = "PENDING"
	StatusProcessing OrderStatus = "PROCESSING"
	StatusComplete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID        int         `json:"id"`
	Type      OrderType   `json:"type"`
	Status    OrderStatus `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
}

type OrderQueue struct {
	mu     sync.Mutex
	orders []*Order
}

func NewOrderQueue() *OrderQueue {
	return &OrderQueue{
		orders: make([]*Order, 0),
	}
}

// Push adds an order and sorts the queue to maintain priority
func (q *OrderQueue) Push(order *Order) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.orders = append(q.orders, order)
	q.sortQueue()
}

// Pop removes and returns the highest priority order from the front
func (q *OrderQueue) Pop() *Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	if len(q.orders) == 0 {
		return nil
	}
	order := q.orders[0]
	q.orders[0] = nil // Allow Garbage Collector to reclaim memory
	q.orders = q.orders[1:]
	return order
}

// GetPending returns a copy of the pending queue for status display
func (q *OrderQueue) GetPending() []*Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	copied := make([]*Order, len(q.orders))
	copy(copied, q.orders)
	return copied
}

// Remove removes a specific order by ID (useful if we ever need to cancel before processing, though not strictly required)
func (q *OrderQueue) Remove(id int) bool {
	q.mu.Lock()
	defer q.mu.Unlock()
	for i, o := range q.orders {
		if o.ID == id {
			q.orders = append(q.orders[:i], q.orders[i+1:]...)
			return true
		}
	}
	return false
}

// Len returns the current size of the queue
func (q *OrderQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.orders)
}

// sortQueue sorts the queue: VIP orders first, then Normal orders.
// Within the same category, orders are ordered by ID ascending (FIFO).
func (q *OrderQueue) sortQueue() {
	sort.Slice(q.orders, func(i, j int) bool {
		if q.orders[i].Type != q.orders[j].Type {
			return q.orders[i].Type == OrderVIP
		}
		return q.orders[i].ID < q.orders[j].ID
	})
}
