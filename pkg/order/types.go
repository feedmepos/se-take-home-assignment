package order

import "time"

// OrderType represents the type of order (VIP or Normal)
type OrderType int

const (
	NormalOrder OrderType = iota
	VIPOrder
)

// OrderStatus represents the current status of an order
type OrderStatus int

const (
	Pending OrderStatus = iota
	Processing
	Complete
)

// BotStatus represents the current status of a bot
type BotStatus int

const (
	Idle BotStatus = iota
	Active
)

// Order represents a customer order
type Order struct {
	ID       int
	Type     OrderType
	Status   OrderStatus
	Created  time.Time
	Started  *time.Time
	Completed *time.Time
}

// Bot represents a cooking bot
type Bot struct {
	ID       int
	Status   BotStatus
	Order    *Order
	Created  time.Time
}

// String returns the string representation of OrderType
func (ot OrderType) String() string {
	switch ot {
	case VIPOrder:
		return "VIP"
	case NormalOrder:
		return "Normal"
	default:
		return "Unknown"
	}
}

// String returns the string representation of OrderStatus
func (os OrderStatus) String() string {
	switch os {
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

// String returns the string representation of BotStatus
func (bs BotStatus) String() string {
	switch bs {
	case Idle:
		return "IDLE"
	case Active:
		return "ACTIVE"
	default:
		return "UNKNOWN"
	}
}
