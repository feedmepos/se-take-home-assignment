package order

import (
	"fmt"
	"time"
)

// OrderType represents Normal or VIP.
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

func (t OrderType) String() string {
	if t == VIP {
		return "VIP"
	}
	return "Normal"
}

// Order statuses.
const (
	StatusPending    = "PENDING"
	StatusProcessing = "PROCESSING"
	StatusComplete   = "COMPLETE"
)

// Order is a McDonald's order.
type Order struct {
	ID       int
	Type     OrderType
	Status   string
	CreateAt time.Time
}

func (o *Order) String() string {
	return fmt.Sprintf("Order #%d (%s) - %s", o.ID, o.Type.String(), o.Status)
}

// BotStatus represents Idle or Processing.
type BotStatus int

const (
	Idle BotStatus = iota
	Processing
)

func (s BotStatus) String() string {
	if s == Processing {
		return "PROCESSING"
	}
	return "IDLE"
}

// Bot is a cooking bot that processes one order at a time.
type Bot struct {
	ID           int
	Status       BotStatus
	CurrentOrder *Order
	stopChannel  chan struct{}
}
