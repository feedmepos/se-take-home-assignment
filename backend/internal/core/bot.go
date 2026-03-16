package core

type BotStatus int

const (
	Idle BotStatus = iota
	BotProcessing
)

func (s BotStatus) String() string {
	if s == BotProcessing {
		return "PROCESSING"
	}
	return "IDLE"
}

type Bot struct {
	ID     int       `json:"id"`
	Status BotStatus `json:"status"`
	Order  *Order    `json:"order,omitempty"`
}

func NewBot(id int) *Bot {
	return &Bot{ID: id, Status: Idle}
}

func (b *Bot) Assign(o *Order) {
	b.Status = BotProcessing
	b.Order = o
	o.Status = Processing
}

func (b *Bot) Complete() *Order {
	o := b.Order
	o.Status = Complete
	b.Order = nil
	b.Status = Idle
	return o
}

func (b *Bot) Cancel() *Order {
	o := b.Order
	b.Order = nil
	b.Status = Idle
	return o
}
