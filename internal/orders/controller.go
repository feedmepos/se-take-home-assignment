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
	controller.pending = append(controller.pending, order)

	return nil
}

func (controller *OrderController) Snapshot() Snapshot {
	pending := make([]Order, len(controller.pending))
	copy(pending, controller.pending)

	return Snapshot{PendingOrders: pending}
}

type Event struct{}
