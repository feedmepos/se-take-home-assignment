package internal

import "time"

type BotStatus int

const (
	BotIdle BotStatus = iota
	BotProcessing
)

func (s BotStatus) String() string {
	if s == BotProcessing {
		return "PROCESSING"
	}
	return "IDLE"
}

type Bot struct {
	ID        int
	Status    BotStatus
	Order     *Order
	StartTime time.Time
	timer     *time.Timer
}
