package order

import "time"

type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

type OrderStatus int

const (
	OrderPending OrderStatus = iota
	OrderProcessing
	OrderCompleted
)

type Order struct {
	ID                uint64
	Type              OrderType
	Status            OrderStatus
	ProcessingStarted time.Time
}

type BotStatus int

const (
	BotIdle BotStatus = iota
	BotBusy
)

type Bot struct {
	ID     uint64
	Status BotStatus
	Order  *Order
}

type Event struct {
	Timestamp time.Time
	Message   string
}
