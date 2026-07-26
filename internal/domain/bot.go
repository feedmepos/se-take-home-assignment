package domain

type BotStatus string

const (
	BotStatusActive BotStatus = "ACTIVE"
	BotStatusIdle   BotStatus = "IDLE"
)

type Bot struct {
	ID     uint
	Status BotStatus
	Order  *Order
}

func NewBot(id uint) *Bot {
	return &Bot{
		ID:     id,
		Status: BotStatusActive,
	}
}

func (b *Bot) Idle() {
	b.Status = BotStatusIdle
}
