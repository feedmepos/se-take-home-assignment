package domain

import "context"

// BotState declares whether a bot is available or working.
type BotState string

const (
	// BotStateIdle means the bot is waiting for work.
	BotStateIdle BotState = "IDLE"
	// BotStateBusy means the bot is processing one order.
	BotStateBusy BotState = "BUSY"
)

// Bot tracks one worker's runtime state.
type Bot struct {
	ID           int
	State        BotState
	CurrentOrder *Order
	cancel       context.CancelFunc
}
