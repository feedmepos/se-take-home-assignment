// Package core contains the business models and domain rules for the
// McDonald's order controller: orders and the bots that process them.
package core

// OrderKind distinguishes VIP orders (served ahead of Normal orders) from
// regular Normal orders.
type OrderKind int

const (
	// Normal is a regular, non-priority order.
	Normal OrderKind = iota
	// VIP is a priority order: it queues ahead of all Normal orders but
	// behind any VIP orders already waiting.
	VIP
)

// String returns the human-readable name of the order kind.
func (k OrderKind) String() string {
	switch k {
	case VIP:
		return "VIP"
	default:
		return "Normal"
	}
}

// OrderStatus represents where an order is in its lifecycle.
type OrderStatus int

const (
	// Pending orders are waiting in the queue for a bot to pick them up.
	Pending OrderStatus = iota
	// Processing orders are currently being cooked by a bot.
	Processing
	// Complete orders have finished processing.
	Complete
)

// String returns the human-readable name of the order status.
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

// Order is a single customer order tracked by the controller. IDs are unique
// and strictly increasing in the order orders were created.
type Order struct {
	ID     int
	Kind   OrderKind
	Status OrderStatus
}
