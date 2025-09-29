package order

import "time"

// OrderType represents the customer type for priority handling
type OrderType string

const (
	Normal OrderType = "Normal"
	VIP    OrderType = "VIP"
)

// OrderStatus represents the lifecycle state of an order
type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Completed  OrderStatus = "COMPLETED"
)

type Order struct {
	ID          int
	Type        OrderType
	Status      OrderStatus
	CreatedAt   time.Time
	CompletedAt time.Time
}
