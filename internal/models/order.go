package models

// OrderType represents the type of an order.
type OrderType string

const (
	OrderTypeNormal OrderType = "Normal"
	OrderTypeVIP    OrderType = "VIP"
)

// OrderStatus represents the lifecycle status of an order.
type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "PENDING"
	OrderStatusProcessing OrderStatus = "PROCESSING"
	OrderStatusComplete   OrderStatus = "COMPLETE"
)

// Order represents a customer order in the system.
type Order struct {
	ID     int
	Type   OrderType
	Status OrderStatus
}
