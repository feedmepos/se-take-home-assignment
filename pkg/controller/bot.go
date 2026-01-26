package controller

import (
	"sync"
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
		return "UNKNOWN"
	}
}

type Bot struct {
	id           int
	status       BotStatus
	currentOrder *Order
	onCompleted  chan *Order
	timer        *time.Timer
	mu           sync.Mutex
}

func (b *Bot) isIdle() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	return b.status == idle && b.currentOrder == nil
}

func (b *Bot) reserve() {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.status = processing
}

func (b *Bot) processOrder(order *Order) {
	b.mu.Lock()
	b.currentOrder = order
	b.status = processing
	b.mu.Unlock()

	b.timer = time.AfterFunc(processTime, func() {
		b.completeProcessing()
		b.onCompleted <- order
	})
}

func (b *Bot) completeProcessing() *Order {
	b.mu.Lock()
	defer b.mu.Unlock()

	o := b.currentOrder
	if o != nil {
		o.status = completed
	}
	b.resetToIdle()

	return o
}

func (b *Bot) stopProcessing() *Order {
	b.mu.Lock()
	defer b.mu.Unlock()

	o := b.currentOrder
	if o != nil {
		o.status = pending
	}
	b.resetToIdle()

	return o
}

func (b *Bot) resetToIdle() {
	b.status = idle
	b.currentOrder = nil
	if b.timer != nil {
		b.timer.Stop()
		b.timer = nil
	}
}
