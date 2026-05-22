package domain

import (
	"sync"
)

type PriorityQueue struct {
	mu        sync.RWMutex
	orders    []*Order
	vipCount  int
}

func NewPriorityQueue() *PriorityQueue {
	return &PriorityQueue{
		orders:   make([]*Order, 0),
		vipCount: 0,
	}
}

func (pq *PriorityQueue) Enqueue(order *Order) {
	pq.mu.Lock()
	defer pq.mu.Unlock()

	if order.IsVIP() {
		position := pq.vipCount
		pq.orders = append(pq.orders, nil)
		copy(pq.orders[position+1:], pq.orders[position:])
		pq.orders[position] = order
		pq.vipCount++
	} else {
		pq.orders = append(pq.orders, order)
	}
}

func (pq *PriorityQueue) Dequeue() *Order {
	pq.mu.Lock()
	defer pq.mu.Unlock()

	if len(pq.orders) == 0 {
		return nil
	}

	order := pq.orders[0]
	pq.orders = pq.orders[1:]
	
	if order.IsVIP() && pq.vipCount > 0 {
		pq.vipCount--
	}
	
	return order
}

func (pq *PriorityQueue) ReturnOrder(order *Order, originalPosition int) {
	pq.mu.Lock()
	defer pq.mu.Unlock()

	if originalPosition < 0 || originalPosition > len(pq.orders) {
		originalPosition = len(pq.orders)
	}

	pq.orders = append(pq.orders, nil)
	copy(pq.orders[originalPosition+1:], pq.orders[originalPosition:])
	pq.orders[originalPosition] = order

	if order.IsVIP() {
		if originalPosition <= pq.vipCount {
			pq.vipCount++
		} else {
			for i := originalPosition; i > pq.vipCount; i-- {
				pq.orders[i], pq.orders[i-1] = pq.orders[i-1], pq.orders[i]
			}
			pq.vipCount++
		}
	} else {
		if originalPosition < pq.vipCount {
			for i := originalPosition; i < pq.vipCount; i++ {
				pq.orders[i], pq.orders[i+1] = pq.orders[i+1], pq.orders[i]
			}
		}
	}
}

func (pq *PriorityQueue) Peek() *Order {
	pq.mu.RLock()
	defer pq.mu.RUnlock()

	if len(pq.orders) == 0 {
		return nil
	}
	return pq.orders[0]
}

func (pq *PriorityQueue) Size() int {
	pq.mu.RLock()
	defer pq.mu.RUnlock()

	return len(pq.orders)
}

func (pq *PriorityQueue) GetPendingOrders() []*Order {
	pq.mu.RLock()
	defer pq.mu.RUnlock()

	result := make([]*Order, len(pq.orders))
	copy(result, pq.orders)
	return result
}
