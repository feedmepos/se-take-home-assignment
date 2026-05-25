// ABOUTME: Coordinates order state and cooking bot assignment for the CLI prototype.
// ABOUTME: Provides deterministic methods that can be tested without terminal I/O.
package orders

import "time"

type OrderType string

const (
	NormalOrder OrderType = "Normal"
	VIPOrder    OrderType = "VIP"
)

type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID        int
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
}

type Snapshot struct {
	PendingOrders []Order
}

type OrderController struct {
	nextOrderID int
	pending     []Order
}

func NewController() *OrderController {
	return &OrderController{nextOrderID: 1}
}

func (controller *OrderController) AddOrder(orderType OrderType, at time.Time) []Event {
	order := Order{
		ID:        controller.nextOrderID,
		Type:      orderType,
		Status:    Pending,
		CreatedAt: at,
	}
	controller.nextOrderID++
	controller.queuePendingOrder(order)

	return nil
}

func (controller *OrderController) queuePendingOrder(order Order) {
	insertAt := len(controller.pending)
	for index, pendingOrder := range controller.pending {
		if comesBefore(order, pendingOrder) {
			insertAt = index
			break
		}
	}

	controller.pending = append(controller.pending, Order{})
	copy(controller.pending[insertAt+1:], controller.pending[insertAt:])
	controller.pending[insertAt] = order
}

func comesBefore(candidate Order, current Order) bool {
	if candidate.Type == VIPOrder && current.Type == NormalOrder {
		return true
	}
	if candidate.Type != current.Type {
		return false
	}
	if candidate.CreatedAt.Equal(current.CreatedAt) {
		return candidate.ID < current.ID
	}
	return candidate.CreatedAt.Before(current.CreatedAt)
}

func (controller *OrderController) Snapshot() Snapshot {
	pending := make([]Order, len(controller.pending))
	copy(pending, controller.pending)

	return Snapshot{PendingOrders: pending}
}

type Event struct{}
