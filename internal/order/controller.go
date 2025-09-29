package order

import (
	"main/internal/logger"
	"sync"
	"time"
)

type OrderController struct {
	mu              sync.RWMutex
	pendingOrders   []*Order
	completedOrders []*Order
	orderCounter    int
}

func NewOrderController() *OrderController {
	return &OrderController{
		pendingOrders:   make([]*Order, 0),
		completedOrders: make([]*Order, 0),
		orderCounter:    0,
	}
}

// CreateOrder creates a new order with the specified type
func (oc *OrderController) CreateOrder(orderType OrderType) {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	oc.orderCounter++
	order := &Order{
		ID:        oc.orderCounter,
		Type:      orderType,
		Status:    Pending,
		CreatedAt: time.Now(),
	}

	oc.queueOrder(order)

	logger.InfoWithTimeStamp("Created %s Order #%d - Status: %s", order.Type, order.ID, order.Status)
}

// GetNextPendingOrder returns and removes the next order to be processed
func (oc *OrderController) GetNextPendingOrder() *Order {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.pendingOrders) == 0 {
		return nil
	}

	order := oc.pendingOrders[0]
	oc.pendingOrders = oc.pendingOrders[1:]
	order.Status = Processing
	return order
}

func (oc *OrderController) ProcessOrder(order *Order) {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order.Status = Processing
}

// CompleteOrder moves an order from processing to completed
func (oc *OrderController) CompleteOrder(order *Order) {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order.Status = Completed
	order.CompletedAt = time.Now()
	oc.completedOrders = append(oc.completedOrders, order)
}

// RequeueOrder adds an order back to the pending queue (when bot is removed)
func (oc *OrderController) RequeueOrder(order *Order) {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order.Status = Pending
	oc.queueOrder(order)
}

func (oc *OrderController) queueOrder(order *Order) {
	if order.Type == VIP {
		insertIndex := len(oc.pendingOrders)
		for i, existingOrder := range oc.pendingOrders {
			if existingOrder.Type == Normal {
				insertIndex = i
				break
			}
		}

		oc.pendingOrders = append(oc.pendingOrders[:insertIndex],
			append([]*Order{order}, oc.pendingOrders[insertIndex:]...)...)
	} else {
		oc.pendingOrders = append(oc.pendingOrders, order)
	}
}

// GetPendingOrdersCount returns the number of pending orders
func (oc *OrderController) GetPendingOrdersCount() int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()

	return len(oc.pendingOrders)
}

// GetCompletedOrdersCount returns the number of completed orders
func (oc *OrderController) GetCompletedOrdersCount(orderTypes ...OrderType) int {
	oc.mu.RLock()
	defer oc.mu.RUnlock()

	if len(orderTypes) == 0 {
		return len(oc.completedOrders)
	}

	count := 0

	orderTypesMap := make(map[OrderType]struct{}, len(orderTypes))
	for _, ot := range orderTypes {
		orderTypesMap[ot] = struct{}{}
	}

	for _, order := range oc.completedOrders {
		if _, ok := orderTypesMap[order.Type]; ok {
			count++
		}
	}

	return count
}
