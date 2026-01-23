package controller

import (
	"time"
)

const n = 10

var processTime = n * time.Second

type BotStatus int

const (
	idle BotStatus = iota
	processing
)

func (bs BotStatus) String() string {
	switch bs {
	case idle:
		return "IDLE"
	case processing:
		return "PROCESSING"
	default:
		return "Unknown"
	}
}

type Bot struct {
	id           int
	status       BotStatus
	currentOrder *Order
	onCompleted  chan *Order
	timer        *time.Timer
}

func (b *Bot) startProcessing(order *Order) {
	b.resetTimer()

	b.status = processing
	b.currentOrder = order

	b.timer = time.AfterFunc(processTime, func() {
		b.completeProcessing()
		b.onCompleted <- order
	})
}

func (b *Bot) completeProcessing() {
	o := b.currentOrder
	if o != nil {
		o.status = completed
	}

	b.status = idle
	b.currentOrder = nil
}

func (b *Bot) stopProcessing() *Order {
	b.resetTimer()

	o := b.currentOrder
	if o != nil {
		o.status = pending
	}

	b.status = idle
	b.currentOrder = nil

	return o
}

func (b *Bot) resetTimer() {
	if b.timer != nil {
		b.timer.Stop()
		b.timer = nil
	}
}
