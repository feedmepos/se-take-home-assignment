package model

type Order struct {
	id       int
	priority OrderPriority
	status   OrderStatus
}

func NewOrder(id int, priority OrderPriority, status OrderStatus) *Order {
	return &Order{
		id:       id,
		priority: priority,
		status:   status,
	}
}

func (o *Order) ID() int {
	return o.id
}

func (o *Order) Priority() OrderPriority {
	return o.priority
}

func (o *Order) Status() OrderStatus {
	return o.status
}

func (o *Order) SetStatus(status OrderStatus) {
	o.status = status
}
