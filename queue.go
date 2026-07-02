package main

import (
	"sync"
)

type OrderQueue struct {
	mu          sync.Mutex
	orders      []*Order
	nextOrderID int
	completed   []*Order
	logger      Logger
}

func NewOrderQueue(logger Logger) *OrderQueue {
	return &OrderQueue{
		orders:      []*Order{},
		nextOrderID: 1,
		completed:   []*Order{},
		logger:      logger,
	}
}

func (q *OrderQueue) AddOrder(orderType OrderType) *Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	order := &Order{
		ID:        q.nextOrderID,
		Type:      orderType,
		Status:    StatusPending,
		CreatedAt: now(),
	}
	q.nextOrderID++

	if orderType == OrderTypeVIP {
		vipCount := 0
		for _, o := range q.orders {
			if o.Type == OrderTypeVIP {
				vipCount++
			}
		}
		insertAt := vipCount
		q.orders = append(q.orders[:insertAt], append([]*Order{order}, q.orders[insertAt:]...)...)
	} else {
		q.orders = append(q.orders, order)
	}

	return order
}

func (q *OrderQueue) GetNextOrder() *Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.orders) == 0 {
		return nil
	}

	order := q.orders[0]
	q.orders = q.orders[1:]
	if q.logger != nil {
		q.logger.Logf("[QUEUE] GetNextOrder: Order[%d] Type=%s Status=%s removed from pending", order.ID, order.Type, order.Status)
	}
	return order
}

func (q *OrderQueue) PutBackOrder(order *Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	order.Status = StatusPending

	if order.Type == OrderTypeVIP {
		q.orders = append([]*Order{order}, q.orders...)
	} else {
		vipCount := 0
		for _, o := range q.orders {
			if o.Type == OrderTypeVIP {
				vipCount++
			}
		}
		if vipCount >= len(q.orders) {
			q.orders = append(q.orders, order)
		} else {
			q.orders = append(q.orders[:vipCount], append([]*Order{order}, q.orders[vipCount:]...)...)
		}
	}
	if q.logger != nil {
		q.logger.Logf("[QUEUE] PutBackOrder: Order[%d] Type=%s returned to pending queue (pos=0 for VIP, pos=%d for NORMAL)", order.ID, order.Type, len(q.orders)-1)
	}
}

func (q *OrderQueue) CompleteOrder(order *Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	order.Status = StatusComplete
	order.CompletedAt = now()
	q.completed = append(q.completed, order)
	if q.logger != nil {
		q.logger.Logf("[QUEUE] CompleteOrder: Order[%d] Type=%s marked as COMPLETE at %s", order.ID, order.Type, order.CompletedAt.Format("15:04:05"))
	}
}

func (q *OrderQueue) GetPendingOrders() []*Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	result := make([]*Order, len(q.orders))
	copy(result, q.orders)
	return result
}

func (q *OrderQueue) GetCompletedOrders() []*Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	result := make([]*Order, len(q.completed))
	copy(result, q.completed)
	return result
}

func (q *OrderQueue) GetPendingCount() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.orders)
}
