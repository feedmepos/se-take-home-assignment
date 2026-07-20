package domain

// BotStatus is the state of a cooking bot.
type BotStatus string

const (
	BotStatusIdle       BotStatus = "IDLE"
	BotStatusProcessing BotStatus = "PROCESSING"
)

// Bot is a single cooking bot. It processes exactly one order at a time.
type Bot struct {
	ID             int
	Status         BotStatus
	CurrentOrderID *int // nil when IDLE
}
