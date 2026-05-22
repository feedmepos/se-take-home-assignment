package internal

import "context"

type BotStatus string

const (
	Idle BotStatus = "IDLE"
	Busy BotStatus = "PROCESSING"
)

type Bot struct {
	ID           int
	status       BotStatus
	currentOrder *Order
	cancel       context.CancelFunc
}

// Status returns the current bot status.
func (b *Bot) Status() BotStatus { return b.status }
