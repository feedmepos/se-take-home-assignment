package controller

import (
	"context"
	"sync"

	"mcd-order-controller/internal/order"
)

type BotStatus string

const (
	BotIdle       BotStatus = "IDLE"
	BotProcessing BotStatus = "PROCESSING"
)

// Bot represents a single cooking bot. Its lifecycle is driven by a goroutine
// owned by the Controller. The Controller is the only writer of `status` and
// `current`; callers must use Snapshot to read them safely.
type Bot struct {
	ID int

	cancel context.CancelFunc
	done   chan struct{}
	wake   chan struct{}

	mu      sync.Mutex
	status  BotStatus
	current *order.Order
}

func newBot(id int, cancel context.CancelFunc) *Bot {
	return &Bot{
		ID:     id,
		cancel: cancel,
		done:   make(chan struct{}),
		wake:   make(chan struct{}, 1),
		status: BotIdle,
	}
}

func (b *Bot) setProcessing(o *order.Order) {
	b.mu.Lock()
	b.status = BotProcessing
	b.current = o
	b.mu.Unlock()
}

func (b *Bot) setIdle() {
	b.mu.Lock()
	b.status = BotIdle
	b.current = nil
	b.mu.Unlock()
}

// Snapshot returns a read-only view of the bot's state.
func (b *Bot) Snapshot() (BotStatus, *order.Order) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.status, b.current
}

// notify wakes the bot's processing loop if it is waiting for work.
// Non-blocking: if a notification is already pending it is coalesced.
func (b *Bot) notify() {
	select {
	case b.wake <- struct{}{}:
	default:
	}
}
