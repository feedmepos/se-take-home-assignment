package bot

import (
	"context"
	"main/internal/logger"
	"main/internal/order"
	"sync"
	"time"
)

type BotStatus string

const (
	Idle       BotStatus = "IDLE"
	Processing BotStatus = "PROCESSING"
)

type Bot struct {
	ID           int
	Status       BotStatus
	CurrentOrder *order.Order
	StartTime    time.Time
	cancel       context.CancelFunc
	mu           sync.RWMutex
}

type BotManager struct {
	mu              sync.RWMutex
	bots            []*Bot
	botCounter      int
	orderController *order.OrderController
}

func NewBotManager(orderController *order.OrderController) *BotManager {
	logger.InfoWithTimeStamp("System initialized with 0 bots")
	return &BotManager{
		bots:            make([]*Bot, 0),
		botCounter:      0,
		orderController: orderController,
	}
}

// AddBot creates a new bot and starts its processing loop
func (bm *BotManager) AddBot() *Bot {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	bm.botCounter++
	ctx, cancel := context.WithCancel(context.Background())

	bot := &Bot{
		ID:     bm.botCounter,
		Status: Idle,
		cancel: cancel,
	}

	bm.bots = append(bm.bots, bot)

	logger.InfoWithTimeStamp("Bot #%d created - Status: %s", bot.ID, bot.Status)

	go bm.runBot(ctx, bot)

	return bot
}

// RemoveBot removes the newest bot and cancels any ongoing processing
func (bm *BotManager) RemoveBot() *Bot {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if len(bm.bots) == 0 {
		return nil
	}

	// Remove the newest bot (last in slice)
	botIndex := len(bm.bots) - 1
	removedBot := bm.bots[botIndex]
	bm.bots = bm.bots[:botIndex]

	// Cancel the bot's processing
	removedBot.cancel()

	// If the bot was processing an order, requeue it
	removedBot.mu.RLock()
	currentOrder := removedBot.CurrentOrder
	removedBot.mu.RUnlock()

	if currentOrder != nil {
		bm.orderController.RequeueOrder(currentOrder)
	}

	logger.InfoWithTimeStamp("Bot #%d destroyed while %s", removedBot.ID, removedBot.Status)

	return removedBot
}

func (bm *BotManager) GetActiveBotsCount() int {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	return len(bm.bots)
}

// runBot is the main processing loop for a bot
func (bm *BotManager) runBot(ctx context.Context, bot *Bot) {
	idleWithNoPendingOrders := false

	for {
		select {
		case <-ctx.Done():
			return
		default:
			nextOrder := bm.orderController.GetNextPendingOrder()
			if nextOrder == nil {
				time.Sleep(1 * time.Second)
				if !idleWithNoPendingOrders {
					idleWithNoPendingOrders = true
					logger.InfoWithTimeStamp("Bot #%d is now IDLE - No pending orders", bot.ID)
				}
				continue
			}

			idleWithNoPendingOrders = false
			bm.processOrder(ctx, bot, nextOrder)
		}
	}
}

// processOrder handles the 10-second processing of an order
func (bm *BotManager) processOrder(ctx context.Context, bot *Bot, order *order.Order) {
	bot.mu.Lock()
	bot.Status = Processing
	bot.CurrentOrder = order
	bot.StartTime = time.Now()
	logger.InfoWithTimeStamp("Bot #%d picked up %s Order #%s - Status: %s", bot.ID, order.Type, order.ID, order.Status)
	bot.mu.Unlock()

	// Process for 10 seconds or until cancelled
	timer := time.NewTimer(10 * time.Second)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		bot.mu.Lock()
		bot.Status = Idle
		bot.CurrentOrder = nil
		bot.mu.Unlock()
		return
	case <-timer.C:
		// Processing completed
		bm.orderController.CompleteOrder(order)

		bot.mu.Lock()
		bot.Status = Idle
		bot.CurrentOrder = nil
		logger.InfoWithTimeStamp("Bot #%d completed %s Order #%s - Status: COMPLETE (Processing time: 10s)", bot.ID, order.Type, order.ID)
		bot.mu.Unlock()
	}
}
