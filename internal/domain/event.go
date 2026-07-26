package domain

import (
	"time"
)

type EventBus interface {
	OrderCreated(order Order)
	OrderPickedUp(bot Bot, order Order)
	OrderReQueued(order Order)
	OrderCompleted(bot Bot, order Order, duration time.Duration)
	BotCreated(bot Bot)
	BotIdle(bot Bot)
	BotDestroyed(bot Bot)
	Listen()
	Close()
}

type EventKind string

const (
	OrderCreated   EventKind = "order_created"
	OrderPickedUp  EventKind = "order_picked_up"
	OrderReQueued  EventKind = "order_re_queued"
	OrderCompleted EventKind = "order_completed"

	BotCreated   EventKind = "bot_created"
	BotIdle      EventKind = "bot_idle"
	BotDestroyed EventKind = "bot_destroyed"
)

type Event struct {
	Kind      EventKind
	Message   string
	Timestamp time.Time
}
