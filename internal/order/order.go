package order

import "time"

// OrderType represents the type of order (Normal or VIP)
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

// OrderStatus represents the current status of an order
type OrderStatus int

const (
	PENDING OrderStatus = iota
	PROCESSING
	COMPLETE
)

// Order represents a customer order
type Order struct {
	ID          int
	Type        OrderType
	Status      OrderStatus
	CreatedAt   time.Time
	CompletedAt time.Time
}

// NewOrder creates a new order with the given ID and type
func NewOrder(id int, orderType OrderType) *Order {
	return &Order{
		ID:        id,
		Type:      orderType,
		Status:    PENDING,
		CreatedAt: time.Now(),
	}
}

// SetProcessing updates the order status to PROCESSING
func (o *Order) SetProcessing() {
	o.Status = PROCESSING
}

// SetComplete updates the order status to COMPLETE and sets the completion time
func (o *Order) SetComplete() {
	o.Status = COMPLETE
	o.CompletedAt = time.Now()
}

// SetPending returns the order to PENDING status (used when bot is removed)
func (o *Order) SetPending() {
	o.Status = PENDING
}

// IsVIP returns true if the order is a VIP order
func (o *Order) IsVIP() bool {
	return o.Type == VIP
}

// String returns a string representation of the order type
func (ot OrderType) String() string {
	switch ot {
	case VIP:
		return "VIP"
	case Normal:
		return "Normal"
	default:
		return "Unknown"
	}
}

// String returns a string representation of the order status
func (os OrderStatus) String() string {
	switch os {
	case PENDING:
		return "PENDING"
	case PROCESSING:
		return "PROCESSING"
	case COMPLETE:
		return "COMPLETE"
	default:
		return "Unknown"
	}
}
