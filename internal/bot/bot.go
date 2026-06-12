package bot

import (
	"context"
	"time"

	"github.com/se-take-home-assignment/internal/model"
)

// ProcessDuration is the time a bot takes to process one order.
var ProcessDuration = 10 * time.Second

// Bot represents a cooking bot that processes orders.
type Bot struct {
	ID           int16
	CurrentOrder *model.Order
	ctx          context.Context
	cancel       context.CancelFunc
	onComplete   func(bot *Bot, order *model.Order)
}

// New creates a new Bot with the given ID and completion callback.
func New(id int16, onComplete func(bot *Bot, order *model.Order)) *Bot {
	return &Bot{
		ID:         id,
		onComplete: onComplete,
	}
}

// IsIdle returns true if the bot is not currently processing any order.
func (b *Bot) IsIdle() bool {
	return b.CurrentOrder == nil
}

// Process starts processing the given order.
// After ProcessDuration, the order is marked as Complete and the callback is invoked.
// The processing can be cancelled via Stop().
func (b *Bot) Process(order *model.Order) {
	if order == nil {
		return
	}

	b.CurrentOrder = order
	order.Status = model.Processing
	b.ctx, b.cancel = context.WithCancel(context.Background())

	go func() {
		select {
		case <-time.After(ProcessDuration):
			// Order completed successfully
			order.Status = model.Complete
			b.CurrentOrder = nil
			if b.onComplete != nil {
				b.onComplete(b, order)
			}
		case <-b.ctx.Done():
			// Bot was destroyed, processing cancelled
			return
		}
	}()
}

// Stop cancels the current processing and returns the in-progress order (if any).
// The returned order will have its status reset to Pending.
func (b *Bot) Stop() *model.Order {
	if b.cancel != nil {
		b.cancel()
	}
	order := b.CurrentOrder
	if order != nil {
		order.Status = model.Pending
		b.CurrentOrder = nil
	}
	return order
}
