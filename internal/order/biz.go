package order

import "sync/atomic"

const (
	PriorityVIP    = 0
	PriorityNormal = 100
)

type Order struct {
	id       int
	priority int
}

var nextID atomic.Int64

func NewVIP() *Order {
	return &Order{
		id:       int(nextID.Add(1)),
		priority: PriorityVIP,
	}
}

func NewNormal() *Order {
	return &Order{
		id:       int(nextID.Add(1)),
		priority: PriorityNormal,
	}
}

func (o *Order) ID() int       { return o.id }
func (o *Order) Priority() int { return o.priority }
