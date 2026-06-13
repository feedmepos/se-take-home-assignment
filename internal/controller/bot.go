package controller

import "context"

type BotStatus string

const (
	BotIdle       BotStatus = "IDLE"
	BotProcessing BotStatus = "PROCESSING"
)

type bot struct {
	id           int
	current      *Order
	cancel       context.CancelFunc
	done         chan struct{}
	idleReported bool
}

func (b *bot) status() BotStatus {
	if b.current != nil {
		return BotProcessing
	}
	return BotIdle
}

type BotView struct {
	ID      int
	Status  BotStatus
	OrderID int
}

func viewBot(b *bot) BotView {
	view := BotView{
		ID:     b.id,
		Status: b.status(),
	}
	if b.current != nil {
		view.OrderID = b.current.ID
	}
	return view
}
