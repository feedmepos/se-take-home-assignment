package bot

import (
	"context"
	"main/internal/logger"
	"main/internal/order"
	"sync"
	"time"
)

type BotController struct {
	mu         sync.RWMutex
	bots       []*Bot
	botCounter int
	oc         *order.OrderController
}

func NewBotController(oc *order.OrderController) *BotController {
	logger.InfoWithTimeStamp("System initialized with 0 bots")
	return &BotController{
		bots:       make([]*Bot, 0),
		botCounter: 0,
		oc:         oc,
	}
}

func (bm *BotController) AddBot() {
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

	go bm.runBot(ctx, bot)

	logger.InfoWithTimeStamp("Bot #%d created - Status: %s", bot.ID, bot.Status)
}

// RemoveBot removes the newest bot and cancels any ongoing processing
func (bm *BotController) RemoveBot() {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if len(bm.bots) == 0 {
		return
	}

	// Remove the newest bot (last in slice)
	botIndex := len(bm.bots) - 1
	removedBot := bm.bots[botIndex]
	bm.bots = bm.bots[:botIndex]

	// If the bot was processing an order, capture the order
	removedBot.mu.RLock()
	currentOrder := removedBot.CurrentOrder
	removedBot.mu.RUnlock()

	// Cancel the bot's processing
	removedBot.cancel()

	// Requeue the order
	if currentOrder != nil {
		bm.oc.RequeueOrder(currentOrder)
	}

	logger.InfoWithTimeStamp("Bot #%d destroyed while %s", removedBot.ID, removedBot.Status)
}

func (bm *BotController) GetActiveBotsCount() int {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	return len(bm.bots)
}

// runBot is the main processing loop for a bot
func (bm *BotController) runBot(ctx context.Context, bot *Bot) {
	idleWithNoPendingOrders := false

	for {
		select {
		case <-ctx.Done():
			return
		default:
			nextOrder := bm.oc.GetNextPendingOrder()
			if nextOrder == nil {
				// To ensure we log "IDLE - No pending orders" only once per idle
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
func (bm *BotController) processOrder(ctx context.Context, bot *Bot, order *order.Order) {
	bot.mu.Lock()
	bot.Status = Processing
	bot.CurrentOrder = order
	bot.StartTime = time.Now()
	bm.oc.ProcessOrder(order)
	bot.mu.Unlock()

	logger.InfoWithTimeStamp("Bot #%d picked up %s Order #%d - Status: %s", bot.ID, order.Type, order.ID, order.Status)

	timer := time.NewTimer(botProcessingTime)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		resetBotToIdle(bot)
		return
	case <-timer.C:
		bm.oc.CompleteOrder(order)

		resetBotToIdle(bot)

		logger.InfoWithTimeStamp("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)", bot.ID, order.Type, order.ID, int(botProcessingTime.Seconds()))
	}
}

func resetBotToIdle(bot *Bot) {
	bot.mu.Lock()
	defer bot.mu.Unlock()

	bot.Status = Idle
	bot.CurrentOrder = nil
}
