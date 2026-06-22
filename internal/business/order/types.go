package order

import "time"

// Order represents a customer order with a priority type and lifecycle status.
type Order struct {
	ID                uint64
	Type              OrderType
	Status            OrderStatus
	ProcessingStarted time.Time
	seq               uint64
}

// Bot represents a cooking bot that can process orders.
type Bot struct {
	ID     uint64
	Status BotStatus
	Order  *Order
}

// Event represents a timestamped log entry recorded by the Recorder.
type Event struct {
	Timestamp time.Time
	Message   string
}
