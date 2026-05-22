package code

import (
	"sync"
	"sync/atomic"
	"time"
)

// Bot represents a cooking bot that processes orders from the queue.
// Each bot runs in its own goroutine and processes one order at a time.
type Bot struct {
	ID           int           // Unique bot identifier
	busy         int32         // Atomic flag: 1 = processing, 0 = idle
	currentOrder *Order        // The order currently being processed
	orderMu      sync.Mutex    // Protects currentOrder access
	stopChan     chan struct{} // Signal channel to stop the bot
	stopMu       sync.Mutex    // Protects stopChan access
	StopOnce     sync.Once     // Ensures stop signal is sent only once
	controller   *Controller   // Reference to the parent controller
}

// Start begins the bot's processing loop in a separate goroutine.
// The bot continuously polls for orders and processes them until stopped.
func (b *Bot) Start() {
	go func() {
		for {
			// Check for stop signal (non-blocking)
			b.stopMu.Lock()
			stopCh := b.stopChan
			b.stopMu.Unlock()
			select {
			case <-stopCh:
				b.controller.Log("Bot #%d stopped", b.ID)
				return
			default:
			}

			// Try to get next order from queue
			order := b.controller.GetNextOrder()
			if order == nil {
				time.Sleep(200 * time.Millisecond) // No orders, wait before retry
				continue
			}

			// Check if bot is available and claim the order
			if b.isBotBusy() {
				b.controller.ReturnOrderToQueue(order)
				continue
			}

			b.SetCurrentOrder(order)

			b.controller.Log("Bot #%d picked up %s Order #%d - Status: PROCESSING", b.ID, order.Type, order.ID)

			// Process order (blocks for 10 seconds or until stopped)
			processed := b.processOrder(order)

			// Release the bot after order is completed
			b.releaseBot()

			if !processed {
				return // Bot was stopped during processing
			}
		}
	}()
}

// Stop signals the bot to stop processing. Safe to call multiple times.
func (b *Bot) Stop() {
	b.StopOnce.Do(func() {
		b.stopMu.Lock()
		defer b.stopMu.Unlock()
		if b.stopChan != nil {
			close(b.stopChan)
		}
	})
}

// processOrder simulates cooking an order for 10 seconds.
// Returns true if completed successfully, false if interrupted by stop signal.
func (b *Bot) processOrder(order *Order) bool {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	b.stopMu.Lock()
	stopCh := b.stopChan
	b.stopMu.Unlock()

	select {
	case <-ticker.C:
		// Order completed successfully
		b.controller.CompleteOrder(order)
		b.controller.Log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)",
			b.ID, order.Type, order.ID)
		return true

	case <-stopCh:
		// Bot stopped while processing - return order to queue
		b.controller.ReturnOrderToQueue(order)
		b.controller.Log("Bot #%d destroyed while processing %s Order #%d - returning to queue",
			b.ID, order.Type, order.ID)
		return false
	}
}

// AddBot creates a new bot, adds it to the fleet, and starts its processing loop.
// Returns the newly created bot.
func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	newID := c.nextBotID
	c.nextBotID++
	bot := NewBot(newID, c)
	c.Bots = append(c.Bots, bot)
	c.mu.Unlock()

	bot.Start()

	c.Log("Bot #%d created - Status: ACTIVE", bot.ID)
	return bot
}

// NewBot creates a new bot
func NewBot(id int, controller *Controller) *Bot {
	return &Bot{
		ID:         id,
		stopChan:   make(chan struct{}),
		controller: controller,
	}
}

// RemoveBot removes and stops the newest bot (LIFO order).
// If bot is processing an order, the order is returned to the queue.
func (c *Controller) RemoveBot() {
	c.mu.Lock()
	if len(c.Bots) == 0 {
		c.mu.Unlock()
		c.Log("No bots to remove")
		return
	}

	// Remove the last bot (newest)
	bot := c.Bots[len(c.Bots)-1]
	c.Bots = c.Bots[:len(c.Bots)-1]
	c.mu.Unlock()

	bot.Stop()

	c.Log("Bot #%d removed - Status: INACTIVE", bot.ID)
}

// StopAllBots stops all bots gracefully.
// Any orders being processed are returned to the queue.
func (c *Controller) StopAllBots() {
	c.mu.Lock()
	// Copy slice to avoid holding lock while stopping bots
	botsToStop := make([]*Bot, len(c.Bots))
	copy(botsToStop, c.Bots)
	c.Bots = []*Bot{}
	c.mu.Unlock()

	for _, bot := range botsToStop {
		bot.Stop()
	}
}

// GetCurrentOrder safely returns the current order being processed
func (b *Bot) GetCurrentOrder() *Order {
	b.orderMu.Lock()
	defer b.orderMu.Unlock()
	return b.currentOrder
}

// SetCurrentOrder safely sets the current order
func (b *Bot) SetCurrentOrder(order *Order) {
	b.orderMu.Lock()
	defer b.orderMu.Unlock()
	b.currentOrder = order
}

// IsBusy returns whether the bot is currently processing an order
func (b *Bot) IsBusy() bool {
	return atomic.LoadInt32(&b.busy) == 1
}

// isBotBusy checks if bot is busy and atomically claims it if available.
// Returns true if bot was already busy (cannot claim), false if successfully claimed.
func (b *Bot) isBotBusy() bool {
	return !atomic.CompareAndSwapInt32(&b.busy, 0, 1)
}

// releaseBot marks the bot as idle and clears the current order.
func (b *Bot) releaseBot() {
	atomic.StoreInt32(&b.busy, 0)
	b.SetCurrentOrder(nil)
}
