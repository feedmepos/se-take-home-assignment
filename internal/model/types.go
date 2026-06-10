// Package model defines the shared domain types for the order management system.
package model

import "time"

// OrderType distinguishes between Normal and VIP customer orders.
type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

// OrderStatus tracks the lifecycle state of an order.
type OrderStatus int

const (
	StatusPending    OrderStatus = iota // waiting to be picked up
	StatusProcessing                    // currently being processed by a bot
	StatusComplete                      // finished processing
)

// Order represents a customer order in the system.
type Order struct {
	ID          int
	Type        OrderType
	Status      OrderStatus
	CreatedAt   time.Time
	CompletedAt time.Time // zero value means not yet completed
}

// BotStatus tracks whether a bot is idle or busy.
type BotStatus int

const (
	BotIdle       BotStatus = iota
	BotProcessing
)

// BotCallbacks are invoked by a Bot to notify the Controller of lifecycle events.
type BotCallbacks struct {
	OnComplete func(order *Order)
}
