package bot

import (
	"mcdonalds-order-system/internal/model"
	"sync"
	"time"
)

type BotStatus string

const (
	BotStatusIdle   BotStatus = "IDLE"
	BotStatusActive BotStatus = "ACTIVE"
)

// DefaultProcessingTime is the default time to process an order
var DefaultProcessingTime = 10 * time.Second

type Bot struct {
	ID             int
	Status         BotStatus
	CurrentOrder   *model.Order
	ProcessingTime time.Duration
	stopChan       chan struct{}
	mu             sync.Mutex
	onComplete     func(order *model.Order)
	onIdle         func(bot *Bot)
	stopped        bool
}

func NewBot(id int, onComplete func(order *model.Order), onIdle func(bot *Bot)) *Bot {
	return &Bot{
		ID:             id,
		Status:         BotStatusIdle,
		ProcessingTime: DefaultProcessingTime,
		stopChan:       make(chan struct{}),
		onComplete:     onComplete,
		onIdle:         onIdle,
		stopped:        false,
	}
}

// NewBotWithProcessingTime creates a bot with custom processing time (for testing)
func NewBotWithProcessingTime(id int, processingTime time.Duration, onComplete func(order *model.Order), onIdle func(bot *Bot)) *Bot {
	bot := NewBot(id, onComplete, onIdle)
	bot.ProcessingTime = processingTime
	return bot
}

// ProcessOrder starts processing an order
func (b *Bot) ProcessOrder(order *model.Order) {
	b.mu.Lock()
	if b.stopped {
		b.mu.Unlock()
		return
	}
	b.CurrentOrder = order
	b.Status = BotStatusActive
	order.Status = model.OrderStatusProcessing
	b.mu.Unlock()

	go b.doProcess()
}

func (b *Bot) doProcess() {
	timer := time.NewTimer(b.ProcessingTime)
	defer timer.Stop()

	select {
	case <-timer.C:
		// Processing completed
		b.mu.Lock()
		if b.stopped {
			b.mu.Unlock()
			return
		}
		order := b.CurrentOrder
		order.Status = model.OrderStatusComplete
		b.CurrentOrder = nil
		b.Status = BotStatusIdle
		b.mu.Unlock()

		if b.onComplete != nil {
			b.onComplete(order)
		}
		if b.onIdle != nil {
			b.onIdle(b)
		}

	case <-b.stopChan:
		// Bot was stopped
		return
	}
}

// Stop stops the bot and returns the current order if any
func (b *Bot) Stop() *model.Order {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.stopped {
		return nil
	}
	b.stopped = true

	close(b.stopChan)

	order := b.CurrentOrder
	if order != nil {
		order.Status = model.OrderStatusPending
		b.CurrentOrder = nil
	}
	return order
}

// IsIdle returns true if the bot is idle
func (b *Bot) IsIdle() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.Status == BotStatusIdle && !b.stopped
}

// IsStopped returns true if the bot has been stopped
func (b *Bot) IsStopped() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.stopped
}
