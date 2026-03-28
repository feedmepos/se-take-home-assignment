package domain

import "time"

type Order struct {
	ID        uint64
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
	Position  int
}

func NewOrder(id uint64, orderType OrderType) *Order {
	return &Order{
		ID:        id,
		Type:      orderType,
		Status:    OrderPending,
		CreatedAt: time.Now(),
	}
}

func (o *Order) MarkProcessing() {
	o.Status = OrderProcessing
}

func (o *Order) MarkComplete() {
	o.Status = OrderComplete
}

func (o *Order) IsVIP() bool {
	return o.Type == VIP
}
