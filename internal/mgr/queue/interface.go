package queue

import "github.com/se-take-home-assignment/internal/order"

type OrderQueue interface {
	Enqueue(o *order.Order)
	Dequeue(stopCh <-chan struct{}) *order.Order
	RecycleOrder(o *order.Order)
	CompleteOrder(o *order.Order)

	PendingOrders() []*order.Order
	ProcessingOrders() []*order.Order
	CompletedOrders() []*order.Order
}
