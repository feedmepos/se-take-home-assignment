// Package bot implements a cooking bot that processes one order at a time.
// Processing takes a fixed 10-second duration (injected via doneCh for testability).
// A bot can be stopped mid-processing via its internal stopCh, which triggers
// order rollback handled by the Controller.
package bot

import (
	"fmt"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/model"
)

// Bot represents a cooking bot that processes customer orders.
type Bot struct {
	ID           int
	Status       model.BotStatus
	CurrentOrder *model.Order
	callbacks    *model.BotCallbacks
	stopCh       chan struct{}
}

// NewBot creates a new idle Bot with the given ID and optional callbacks.
func NewBot(id int, callbacks *model.BotCallbacks) *Bot {
	return &Bot{
		ID:        id,
		Status:    model.BotIdle,
		callbacks: callbacks,
		stopCh:    make(chan struct{}),
	}
}

// Assign gives the bot an order to process. doneCh is used to signal
// completion — in production this is time.After(10*time.Second), in
// tests it is a manually controlled channel.
// Returns an error if the bot is already processing an order.
func (b *Bot) Assign(order *model.Order, doneCh <-chan time.Time) error {
	if b.Status == model.BotProcessing {
		return fmt.Errorf("bot %d is already processing order %d", b.ID, b.CurrentOrder.ID)
	}
	b.Status = model.BotProcessing
	b.CurrentOrder = order
	order.Status = model.StatusProcessing

	// fresh stopCh for each assignment (reuse after Reset)
	b.stopCh = make(chan struct{})
	go b.process(order, doneCh)
	return nil
}

// Stop interrupts the bot's current processing. If the bot is IDLE,
// this is a no-op.
func (b *Bot) Stop() {
	if b.Status == model.BotProcessing {
		close(b.stopCh)
	}
}

// Reset clears the bot's state back to IDLE. Called by Controller
// after OnComplete or after a stopped bot is handled.
func (b *Bot) Reset() {
	b.Status = model.BotIdle
	b.CurrentOrder = nil
}

// process runs in a goroutine and waits for either the timer to fire
// (normal completion) or the stopCh to be closed (interrupted).
func (b *Bot) process(order *model.Order, doneCh <-chan time.Time) {
	select {
	case <-doneCh:
		// Normal completion — notify Controller via callback
		if b.callbacks != nil && b.callbacks.OnComplete != nil {
			b.callbacks.OnComplete(order)
		}
	case <-b.stopCh:
		// Bot was stopped — Controller will handle rollback
	}
}
