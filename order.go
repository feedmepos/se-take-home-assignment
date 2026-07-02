package main

import (
	"fmt"
	"time"
)

type OrderStatus string

const (
	StatusPending  OrderStatus = "PENDING"
	StatusComplete OrderStatus = "COMPLETE"
)

type OrderType string

const (
	OrderTypeNormal OrderType = "NORMAL"
	OrderTypeVIP    OrderType = "VIP"
)

type Order struct {
	ID          int
	Type        OrderType
	Status      OrderStatus
	CreatedAt   time.Time
	CompletedAt time.Time
}

func (o *Order) String() string {
	return fmt.Sprintf("Order[%d]{%s,%s}", o.ID, o.Type, o.Status)
}
