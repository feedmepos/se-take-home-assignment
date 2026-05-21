package model

import (
	"fmt"
	"time"
)

type OrderType string
type OrderStatus string

const (
	OrderTypeNormal OrderType = "Normal"
	OrderTypeVIP    OrderType = "VIP"
)

const (
	OrderStatusPending    OrderStatus = "PENDING"
	OrderStatusProcessing OrderStatus = "PROCESSING"
	OrderStatusComplete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID        int
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
}

func NewOrder(id int, orderType OrderType) *Order {
	return &Order{
		ID:        id,
		Type:      orderType,
		Status:    OrderStatusPending,
		CreatedAt: time.Now(),
	}
}

func (o *Order) String() string {
	return fmt.Sprintf("%s Order #%d", o.Type, o.ID)
}
