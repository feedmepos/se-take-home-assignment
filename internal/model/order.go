package model

import "fmt"

// OrderType represents the type of an order.
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

// String returns a human-readable representation of the order type.
func (t OrderType) String() string {
	switch t {
	case Normal:
		return "Normal"
	case VIP:
		return "VIP"
	default:
		return "Unknown"
	}
}

// OrderStatus represents the current status of an order.
type OrderStatus int

const (
	Pending OrderStatus = iota
	Processing
	Complete
)

// String returns a human-readable representation of the order status.
func (s OrderStatus) String() string {
	switch s {
	case Pending:
		return "PENDING"
	case Processing:
		return "PROCESSING"
	case Complete:
		return "COMPLETE"
	default:
		return "UNKNOWN"
	}
}

// Order represents a customer order.
type Order struct {
	ID     int64
	Type   OrderType
	Status OrderStatus
}

// String returns a formatted string representation of the order.
func (o *Order) String() string {
	return fmt.Sprintf("Order #%d (%s)", o.ID, o.Type)
}
