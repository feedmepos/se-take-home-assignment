package controller

import (
	"time"
)

type BotStatus int

const (
	Idle BotStatus = iota
	Processing
)

func (bs BotStatus) String() string {
	switch bs {
	case Idle:
		return "IDLE"
	case Processing:
		return "PROCESSING"
	default:
		return "Unknown"
	}
}

type Bot struct {
	ID           int
	Status       BotStatus
	CurrentOrder *Order
	onCompleted  chan *Order
	timer        *time.Timer
}

func (b *Bot) StartProcessing(order *Order) {
	b.resetTimer()

	b.Status = Processing
	b.CurrentOrder = order

	b.timer = time.AfterFunc(10*time.Second, func() {
		b.completeProcessing()
		b.onCompleted <- order
	})
}

func (b *Bot) completeProcessing() {
	o := b.CurrentOrder
	if o != nil {
		o.Status = Completed
	}

	b.Status = Idle
	b.CurrentOrder = nil
}

func (b *Bot) StopProcessing() *Order {
	b.resetTimer()

	o := b.CurrentOrder
	if o != nil {
		o.Status = Pending
	}

	b.Status = Idle
	b.CurrentOrder = nil

	return o
}

func (b *Bot) resetTimer() {
	if b.timer != nil {
		b.timer.Stop()
		b.timer = nil
	}
}
