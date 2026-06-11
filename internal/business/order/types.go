package order

import "time"

type Order struct {
	ID                uint64
	Type              OrderType
	Status            OrderStatus
	ProcessingStarted time.Time
	seq               uint64
}

type Bot struct {
	ID     uint64
	Status BotStatus
	Order  *Order
}

type Event struct {
	Timestamp time.Time
	Message   string
}
