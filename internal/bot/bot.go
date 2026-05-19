package bot

import (
	"context"
	"sync"
	"time"

	"github.com/dnisting/se-take-home-assignment/internal/models"
	"github.com/dnisting/se-take-home-assignment/internal/queue"
)

// ProcessingTime is the duration each bot takes to process an order.
// Default uses the model-defined constant. Tests can override this.
var ProcessingTime = models.DefaultProcessingTime

// Bot represents a cooking bot that processes orders from the queue.
type Bot struct {
	ID      int
	queue   *queue.OrderQueue
	logFunc models.LogFunc
	ctx     context.Context
	cancel  context.CancelFunc
	notify  chan struct{}
	current *models.Order
	mu      sync.Mutex
	done    chan struct{}
}

// NewBot creates a new Bot with the given ID, shared queue, and log function.
func NewBot(id int, q *queue.OrderQueue, logFunc models.LogFunc) *Bot {
	ctx, cancel := context.WithCancel(context.Background())
	return &Bot{
		ID:      id,
		queue:   q,
		logFunc: logFunc,
		ctx:     ctx,
		cancel:  cancel,
		notify:  make(chan struct{}, 1),
		done:    make(chan struct{}),
	}
}

// Start launches the bot's processing goroutine.
func (b *Bot) Start() {
	go b.run()
}

// Notify sends a wake-up signal to the bot to check for new orders.
// Non-blocking: if the bot is already notified, this is a no-op.
func (b *Bot) Notify() {
	select {
	case b.notify <- struct{}{}:
	default:
	}
}

// Stop cancels the bot and waits for its goroutine to finish.
// If the bot was processing an order, that order is returned with status reset to PENDING.
// Returns the in-progress order (or nil if idle).
func (b *Bot) Stop() *models.Order {
	b.cancel()
	<-b.done

	b.mu.Lock()
	defer b.mu.Unlock()

	if b.current != nil {
		b.current.Status = models.OrderStatusPending
		order := b.current
		b.current = nil
		return order
	}
	return nil
}

// IsIdle returns true if the bot is not currently processing an order.
func (b *Bot) IsIdle() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.current == nil
}

func (b *Bot) run() {
	defer close(b.done)

	// Try to pick up an order immediately on start
	b.tryProcess()

	for {
		select {
		case <-b.ctx.Done():
			return
		case <-b.notify:
			b.tryProcess()
		}
	}
}

func (b *Bot) tryProcess() {
	for {
		if b.ctx.Err() != nil {
			return
		}

		order := b.queue.Dequeue()
		if order == nil {
			b.logFunc("Bot #%d is now IDLE - No pending orders", b.ID)
			return
		}

		b.mu.Lock()
		b.current = order
		b.mu.Unlock()

		order.Status = models.OrderStatusProcessing
		b.logFunc("Bot #%d picked up %s Order #%d - Status: PROCESSING", b.ID, order.Type, order.ID)

		// Wait for processing time or cancellation
		select {
		case <-time.After(ProcessingTime):
			order.Status = models.OrderStatusComplete
			b.logFunc("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)", b.ID, order.Type, order.ID)

			b.mu.Lock()
			b.current = nil
			b.mu.Unlock()

			// Loop to check for more orders
		case <-b.ctx.Done():
			// Bot was removed mid-processing; order will be returned by Stop()
			return
		}
	}
}
