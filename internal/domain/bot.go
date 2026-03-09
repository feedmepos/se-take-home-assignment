package domain

type BotStatus string

const (
	BotStatusIdle       BotStatus = "idle"
	BotStatusProcessing BotStatus = "processing"
)

type Bot struct {
	ID        int       `json:"id"`
	Status    BotStatus `json:"status"`
	CurrentOrderID int    `json:"current_order_id,omitempty"`
}
