package restaurant

import (
	"sort"
	"time"
)

type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Completed  OrderStatus = "COMPLETED"
)

type Priority string

const (
	Normal Priority = "NORMAL"
	VIP    Priority = "VIP"
)

type Order struct {
	ID                    int
	OrderNo               int
	AmountCents           int64
	Priority              Priority
	Status                OrderStatus
	CreatedAt             time.Time
	ProductionStartedAt   *time.Time
	ProductionCompletedAt *time.Time
}

type orderQueue struct {
	orders        map[int]*Order
	vipPending    []int
	normalPending []int
	nextID        int
	nextNo        int
}

func newOrderQueue() *orderQueue {
	return &orderQueue{
		orders: make(map[int]*Order),
		nextID: 1,
		nextNo: 1001,
	}
}

func (q *orderQueue) create(priority Priority, amountCents int64, now time.Time) *Order {
	order := &Order{
		ID:          q.nextID,
		OrderNo:     q.nextNo,
		AmountCents: amountCents,
		Priority:    priority,
		Status:      Pending,
		CreatedAt:   now,
	}
	q.orders[order.ID] = order
	if order.Priority == VIP {
		q.vipPending = append(q.vipPending, order.ID)
	} else {
		q.normalPending = append(q.normalPending, order.ID)
	}
	q.nextID++
	q.nextNo++
	return order
}

func (q *orderQueue) get(id int) *Order {
	return q.orders[id]
}

func (q *orderQueue) nextPending() *Order {
	q.discardNonPending()
	if len(q.vipPending) > 0 {
		return q.orders[q.vipPending[0]]
	}
	if len(q.normalPending) == 0 {
		return nil
	}
	return q.orders[q.normalPending[0]]
}

func (q *orderQueue) takeNextPending() *Order {
	order := q.nextPending()
	if order == nil {
		return nil
	}
	if order.Priority == VIP {
		q.vipPending = q.vipPending[1:]
	} else {
		q.normalPending = q.normalPending[1:]
	}
	return order
}

func (q *orderQueue) returnToPending(order *Order) {
	order.Status = Pending
	order.ProductionStartedAt = nil
	if order.Priority == VIP {
		q.vipPending = insertByOrderNo(q.vipPending, order, q.orders)
		return
	}
	q.normalPending = insertByOrderNo(q.normalPending, order, q.orders)
}

func (q *orderQueue) discardNonPending() {
	for len(q.vipPending) > 0 && q.orders[q.vipPending[0]].Status != Pending {
		q.vipPending = q.vipPending[1:]
	}
	for len(q.normalPending) > 0 && q.orders[q.normalPending[0]].Status != Pending {
		q.normalPending = q.normalPending[1:]
	}
}

func insertByOrderNo(queue []int, order *Order, orders map[int]*Order) []int {
	index := len(queue)
	for i, id := range queue {
		if order.OrderNo < orders[id].OrderNo {
			index = i
			break
		}
	}
	queue = append(queue, 0)
	copy(queue[index+1:], queue[index:])
	queue[index] = order.ID
	return queue
}

func (q *orderQueue) snapshot() []Order {
	orders := make([]Order, 0, len(q.orders))
	for _, order := range q.orders {
		orders = append(orders, *order)
	}
	sort.Slice(orders, func(i, j int) bool { return orders[i].OrderNo < orders[j].OrderNo })
	return orders
}
