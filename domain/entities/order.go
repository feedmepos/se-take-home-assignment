package entities

import "time"

type OrderType string

const (
	OrderTypeNormal OrderType = "NORMAL"
	OrderTypeVIP    OrderType = "VIP"
	OrderTypeVVIP   OrderType = "VVIP"
)

type Order struct {
	ID                  int
	Type                OrderType
	CreatedAt           time.Time
	ProcessingStartedAt *time.Time
	CompletedAt         *time.Time
	Status              OrderStatus
}

type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "PENDING"
	OrderStatusProcessing OrderStatus = "PROCESSING"
	OrderStatusComplete   OrderStatus = "COMPLETE"
)

const DefaultProcessingDuration = 10 * time.Second

// ProcessingDuration returns the processing duration for this order.
// All types use the default duration for now, but this can be customized per type in the future.
func (o *Order) ProcessingDuration() time.Duration {
	return DefaultProcessingDuration
}
