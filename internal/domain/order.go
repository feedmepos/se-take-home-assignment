package domain

import "time"

// OrderType declares the business priority group of an order.
type OrderType string

const (
	// OrderTypeNormal is a regular customer order.
	OrderTypeNormal OrderType = "NORMAL"
	// OrderTypeVIP is a VIP member order.
	OrderTypeVIP OrderType = "VIP"
)

// OrderStatus represents the order lifecycle in the controller.
type OrderStatus string

const (
	// OrderStatusPending means the order is waiting for an available bot.
	OrderStatusPending OrderStatus = "PENDING"
	// OrderStatusProcessing means the order has been picked by a bot.
	OrderStatusProcessing OrderStatus = "PROCESSING"
	// OrderStatusComplete means the order has finished processing.
	OrderStatusComplete OrderStatus = "COMPLETE"
)

// Order is the in-memory entity that flows through the system.
type Order struct {
	ID        int
	Sequence  int
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
}
