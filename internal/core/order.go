// Package core contains the business models and domain rules for the
// McDonald's order controller: orders and the bots that process them.
package core

// OrderKind distinguishes VIP orders (served ahead of Normal orders) from
// regular Normal orders.
type OrderKind int

const (
	// KindUnknown is the zero value, so an uninitialized Order is never
	// silently treated as a deliberately chosen kind.
	KindUnknown OrderKind = iota
	// KindNormal is a regular, non-priority order.
	KindNormal
	// KindVIP is a priority order: it queues ahead of all Normal orders but
	// behind any VIP orders already waiting.
	KindVIP
)

// String returns the human-readable name of the order kind.
func (k OrderKind) String() string {
	switch k {
	case KindNormal:
		return "Normal"
	case KindVIP:
		return "VIP"
	default:
		return "UNKNOWN"
	}
}

// OrderStatus represents where an order is in its lifecycle.
type OrderStatus int

const (
	// StatusUnknown is the zero value, so an uninitialized Order is never
	// silently treated as being in a real lifecycle state.
	StatusUnknown OrderStatus = iota
	// StatusPending orders are waiting in the queue for a bot to pick them up.
	StatusPending
	// StatusProcessing orders are currently being cooked by a bot.
	StatusProcessing
	// StatusComplete orders have finished processing.
	StatusComplete
)

// String returns the human-readable name of the order status.
func (s OrderStatus) String() string {
	switch s {
	case StatusPending:
		return "PENDING"
	case StatusProcessing:
		return "PROCESSING"
	case StatusComplete:
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
