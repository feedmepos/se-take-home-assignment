package queue

import (
	"sync"

	"github.com/se-take-home-assignment/internal/model"
)

// OrderQueue is a thread-safe priority queue for orders.
// VIP orders are always dequeued before Normal orders.
// Within the same type, orders follow FIFO (by insertion order).
type OrderQueue struct {
	sync.Mutex

	vipOrders    []*model.Order
	normalOrders []*model.Order
}

// New creates a new empty OrderQueue.
func New() *OrderQueue {
	return &OrderQueue{
		vipOrders:    make([]*model.Order, 0),
		normalOrders: make([]*model.Order, 0),
	}
}

// Len returns the total number of orders in the queue.
func (q *OrderQueue) Len() int {
	q.Lock()
	count := len(q.vipOrders) + len(q.normalOrders)
	q.Unlock()
	return count
}

// Enqueue adds an order to the appropriate sub-queue.
// VIP orders go to the VIP queue, Normal orders go to the Normal queue.
func (q *OrderQueue) Enqueue(order *model.Order) {
	q.Lock()
	if order.Type == model.VIP {
		q.vipOrders = append(q.vipOrders, order)
	} else {
		q.normalOrders = append(q.normalOrders, order)
	}
	q.Unlock()
}

// Dequeue removes and returns the highest-priority order.
// VIP orders are served first, then Normal orders.
// Returns nil if both queues are empty.
func (q *OrderQueue) Dequeue() *model.Order {
	q.Lock()
	if len(q.vipOrders) > 0 {
		order := q.vipOrders[0]
		q.vipOrders = q.vipOrders[1:]
		// UNLOCK
		q.Unlock()
		return order
	}
	if len(q.normalOrders) > 0 {
		order := q.normalOrders[0]
		q.normalOrders = q.normalOrders[1:]
		// UNLOCK
		q.Unlock()
		return order
	}
	// UNLOCK
	q.Unlock()
	return nil
}

// InsertByPriority inserts an order back into the queue at its correct position.
// Used when a bot is destroyed and its in-progress order needs to return.
// Within the same type group, orders are sorted by ID (ascending) to maintain original order.
func (q *OrderQueue) InsertByPriority(order *model.Order) {
	q.Lock()

	if order.Type == model.VIP {
		q.vipOrders = insertSorted(q.vipOrders, order)
	} else {
		q.normalOrders = insertSorted(q.normalOrders, order)
	}

	q.Unlock()
}

// insertSorted inserts an order into a slice sorted by ID (ascending).
func insertSorted(orders []*model.Order, order *model.Order) []*model.Order {
	insertIdx := len(orders)
	for i, o := range orders {
		if o.ID > order.ID {
			insertIdx = i
			break
		}
	}
	orders = append(orders, nil)
	copy(orders[insertIdx+1:], orders[insertIdx:])
	orders[insertIdx] = order
	return orders
}

// Orders returns a snapshot of all pending orders in priority order (VIP first, then Normal).
func (q *OrderQueue) Orders() []*model.Order {
	q.Lock()

	result := make([]*model.Order, 0, len(q.vipOrders)+len(q.normalOrders))
	result = append(result, q.vipOrders...)
	result = append(result, q.normalOrders...)

	q.Unlock()
	return result
}
