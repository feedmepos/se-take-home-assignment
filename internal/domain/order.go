package domain

import (
	"container/list"
	"context"
	"time"
)

type QueueRepository interface {
	Queue(order *Order)
	Shift() *Order
	UnShift(order *Order)
	GetPending() *list.List
}

type OrderRepository interface {
	Create(t OrderType) *Order
	UpdateStatus(order *Order, status OrderStatus)
	GetCompletedOrders(OrderType) []*Order
}

type OrderApp interface {
	Create(t OrderType) (*Order, error)
	Pick() *Order
	Process(ctx context.Context, bot Bot, order *Order) error
	ReQueue(order *Order)
	CompletedCount() int
	GetPending() *list.List
}

type (
	OrderType   string
	OrderStatus string
)

const (
	OrderTypeNormal OrderType = "NORMAL"
	OrderTypeVIP    OrderType = "VIP"

	OrderStatusPending    OrderStatus = "PENDING"
	OrderStatusProcessing OrderStatus = "PROCESSING"
	OrderStatusComplete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID        uint
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
}

func NewOrder(id uint, t OrderType) *Order {
	return &Order{
		ID:        id,
		Type:      t,
		Status:    OrderStatusPending,
		CreatedAt: time.Now(),
	}
}

func (o *Order) IsProcessing() bool {
	return o.Status == OrderStatusProcessing
}

func (o *Order) IsCompleted() bool {
	return o.Status == OrderStatusComplete
}
