// Package domain holds the pure business types for the McDonald's order
// controller. It has NO external imports beyond the stdlib and NO concurrency
// concerns — it is the innermost layer of the clean-architecture onion.
package domain

import "time"

// OrderType is the queue-priority class of an order.
type OrderType string

const (
	OrderTypeNormal OrderType = "NORMAL"
	OrderTypeVIP    OrderType = "VIP"
)

// Valid reports whether t is a recognised order type.
func (t OrderType) Valid() bool {
	return t == OrderTypeNormal || t == OrderTypeVIP
}

// OrderStatus is the lifecycle state of an order.
type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "PENDING"
	OrderStatusProcessing OrderStatus = "PROCESSING"
	OrderStatusComplete   OrderStatus = "COMPLETE"
)

// Order is a single cooking job. IDs are unique and strictly increasing across
// ALL orders regardless of type (a single never-reused counter owned by the
// use-case layer).
type Order struct {
	ID          int
	Type        OrderType
	Status      OrderStatus
	CreatedAt   time.Time
	CompletedAt *time.Time // nil until the order reaches COMPLETE
}
