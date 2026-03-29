package domain

import "time"

type Order struct {
	ID           uint64
	Type         OrderType
	Status       OrderStatus
	CreatedAt    time.Time
	Position     int
	StateMachine *FSM
}

func NewOrder(id uint64, orderType OrderType) *Order {
	return &Order{
		ID:           id,
		Type:         orderType,
		Status:       OrderPending,
		CreatedAt:    time.Now(),
		StateMachine: NewOrderFSM(),
	}
}

func (o *Order) MarkProcessing() {
	o.Status = OrderProcessing
	if o.StateMachine != nil {
		o.StateMachine.HandleEvent("assign")
	}
}

func (o *Order) MarkComplete() {
	o.Status = OrderComplete
	if o.StateMachine != nil {
		o.StateMachine.HandleEvent("complete")
	}
}

func (o *Order) IsVIP() bool {
	return o.Type == VIP
}
