package bot

import (
	"assignment/internal/order"
	"context"
	"time"
)

// BotStatus represents the current status of a bot
type BotStatus int

const (
	IDLE BotStatus = iota
	PROCESSING
)

// Bot represents a cooking bot that processes orders
type Bot struct {
	ID          int
	Status      BotStatus
	CurrentOrder *order.Order
	CreatedAt   time.Time
	ctx         context.Context
	cancel      context.CancelFunc
	stopChan    chan struct{}
}

// NewBot creates a new bot with the given ID
func NewBot(id int) *Bot {
	ctx, cancel := context.WithCancel(context.Background())
	return &Bot{
		ID:        id,
		Status:    IDLE,
		CreatedAt: time.Now(),
		ctx:       ctx,
		cancel:    cancel,
		stopChan:  make(chan struct{}),
	}
}

// StartProcessing assigns an order to the bot and starts processing it
// Processing takes 10 seconds. Returns true if processing completed,
// false if it was cancelled.
func (b *Bot) StartProcessing(o *order.Order) bool {
	b.CurrentOrder = o
	b.Status = PROCESSING
	o.SetProcessing()
	
	// Process for 10 seconds, but check for cancellation
	select {
	case <-time.After(10 * time.Second):
		// Processing completed
		o.SetComplete()
		b.Status = IDLE
		b.CurrentOrder = nil
		return true
	case <-b.ctx.Done():
		// Processing was cancelled
		o.SetPending()
		b.Status = IDLE
		b.CurrentOrder = nil
		return false
	}
}

// Stop cancels the bot's current processing and signals the bot to stop
func (b *Bot) Stop() {
	if b.Status == PROCESSING && b.CurrentOrder != nil {
		b.cancel()
	}
	// Signal the bot to stop processing
	select {
	case b.stopChan <- struct{}{}:
	default:
	}
}

// ShouldStop checks if the bot should stop processing
func (b *Bot) ShouldStop() <-chan struct{} {
	return b.stopChan
}

// IsIdle returns true if the bot is currently idle
func (b *Bot) IsIdle() bool {
	return b.Status == IDLE
}

// IsProcessing returns true if the bot is currently processing an order
func (b *Bot) IsProcessing() bool {
	return b.Status == PROCESSING
}

// String returns a string representation of the bot status
func (bs BotStatus) String() string {
	switch bs {
	case IDLE:
		return "IDLE"
	case PROCESSING:
		return "PROCESSING"
	default:
		return "Unknown"
	}
}
