package entities

import "time"

type OrderType string

const (
	OrderTypeNormal OrderType = "NORMAL"
	OrderTypeVIP    OrderType = "VIP"
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
