package mcd

import (
	"context"
)

// Bot represents a cooking bot
type Bot struct {
	ID           int
	ctx          context.Context
	cancel       context.CancelFunc
	done         chan struct{}
	currentOrder *Order // protected by Controller.mu
}

// newBot creates a new bot (package-private, called by Controller)
func newBot(id int) *Bot {
	ctx, cancel := context.WithCancel(context.Background())
	return &Bot{
		ID:     id,
		ctx:    ctx,
		cancel: cancel,
		done:   make(chan struct{}),
	}
}

// run is the bot's main goroutine loop
func (b *Bot) run(c *Controller) {
	defer close(b.done)

	for {
		// Wait for an order or cancellation
		c.mu.Lock()
		for len(c.pending) == 0 && b.ctx.Err() == nil {
			c.mu.Unlock()
			select {
			case <-c.signal:
			case <-b.ctx.Done():
			}
			c.mu.Lock()
		}

		// Check if cancelled
		if b.ctx.Err() != nil {
			c.mu.Unlock()
			return
		}

		// Pick up first pending order
		order := c.pending[0]
		c.pending = c.pending[1:]
		b.currentOrder = order
		c.mu.Unlock()

		c.logf("bot #%d picked up order %s", b.ID, order)

		// Process order (or get cancelled)
		select {
		case <-c.clock.After(c.processDuration):
			// Completed
			c.mu.Lock()
			if b.currentOrder == order {
				c.completed = append(c.completed, order)
				b.currentOrder = nil
				c.mu.Unlock()
				c.logf("bot #%d completed order %s", b.ID, order)
			} else {
				c.mu.Unlock()
			}

		case <-b.ctx.Done():
			// Interrupted
			c.mu.Lock()
			if b.currentOrder == order {
				c.pending = insertSorted(c.pending, order)
				b.currentOrder = nil
				// Wake other bots
				select {
				case c.signal <- struct{}{}:
				default:
				}
				c.mu.Unlock()
				c.logf("bot #%d interrupted, order %s returned to pending", b.ID, order)
			} else {
				c.mu.Unlock()
			}
			return
		}
	}
}
