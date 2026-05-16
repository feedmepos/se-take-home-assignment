package order

import (
	"fmt"
	"os"
	"sync"
	"time"
)

// Bot represents a cooking bot that processes one order at a time.
type Bot struct {
	ID       int          // Unique identifier for the bot
	Active   bool         // Indicates whether the bot is actively running
	stopChan chan bool    // Channel used to signal the bot to stop
}

// BotManager manages a pool of bots and coordinates order processing.
type BotManager struct {
	Bots   []*Bot         // Slice of active bots
	Queue  *Queue         // Shared order queue (pending and completed)
	mu     sync.Mutex     // Mutex to protect concurrent access to Bots
	nextID int            // Counter to assign unique bot IDs
}

// NewBotManager creates a new BotManager with a reference to the shared queue.
func NewBotManager(q *Queue) *BotManager {
	return &BotManager{Queue: q}
}

// AddBot creates a new bot, assigns it a unique ID, and starts its processing loop.
func (bm *BotManager) AddBot() {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	bot := &Bot{
		ID:       bm.nextID,
		Active:   true,
		stopChan: make(chan bool),
	}
	bm.nextID++
	bm.Bots = append(bm.Bots, bot)

	// Start the bot's processing loop in a separate goroutine
	go bm.runBot(bot)
}

// runBot continuously checks for pending orders and processes them one at a time.
// If the bot receives a stop signal, it exits the loop and becomes inactive.
func (bm *BotManager) runBot(bot *Bot) {
	for {
		select {
		case <-bot.stopChan:
			// Stop signal received — deactivate and exit
			bot.Active = false
			return
		default:
			// Try to fetch an order from the queue
			order := bm.Queue.PopOrder()
			if order == nil {
				// No orders available — sleep briefly and retry
				time.Sleep(1 * time.Second)
				continue
			}

			// Simulate order processing (takes 10 seconds)
			start := time.Now()
			time.Sleep(10 * time.Second)

			// Mark the order as completed
			bm.Queue.CompleteOrder(order)

			// Log the completion with timestamp
			fmt.Fprintf(os.Stdout, "[%s] Bot %d completed Order #%d\n", start.Format("15:04:05"), bot.ID, order.ID)
		}
	}
}

// RemoveBot stops the most recently added bot and removes it from the pool.
// If the bot is actively processing an order, it will stop immediately.
func (bm *BotManager) RemoveBot() {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if len(bm.Bots) == 0 {
		// No bots to remove
		return
	}

	// Select the last bot (LIFO removal)
	bot := bm.Bots[len(bm.Bots)-1]

	// Send stop signal to the bot
	bot.stopChan <- true

	// Remove the bot from the pool
	bm.Bots = bm.Bots[:len(bm.Bots)-1]
}