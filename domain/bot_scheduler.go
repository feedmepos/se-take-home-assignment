package domain

import (
	"context"
	"sync"
	"time"
)

type BotScheduler struct {
	bots           map[uint64]*Bot
	queue          *PriorityQueue
	nextBotID      uint64
	mu             sync.RWMutex
	orderPositions map[uint64]int
	completeOrders []*Order
	stopChan       chan struct{}
}

func NewBotScheduler() *BotScheduler {
	return &BotScheduler{
		bots:           make(map[uint64]*Bot),
		queue:          NewPriorityQueue(),
		nextBotID:      1,
		orderPositions: make(map[uint64]int),
		completeOrders: make([]*Order, 0),
		stopChan:       make(chan struct{}),
	}
}

func (bs *BotScheduler) AddBot() *Bot {
	bs.mu.Lock()
	defer bs.mu.Unlock()

	bot := NewBot(bs.nextBotID)
	bs.nextBotID++
	bs.bots[bot.ID] = bot

	bs.tryAssignOrderLocked(bot)

	return bot
}

func (bs *BotScheduler) RemoveBot() (*Bot, *Order) {
	bs.mu.Lock()
	defer bs.mu.Unlock()

	if len(bs.bots) == 0 {
		return nil, nil
	}

	var botToRemove *Bot
	for _, bot := range bs.bots {
		botToRemove = bot
		break
	}

	delete(bs.bots, botToRemove.ID)

	var order *Order
	if botToRemove.IsProcessing() {
		order = botToRemove.StopProcessing()
		if order != nil {
			order.Status = OrderPending
			originalPosition, exists := bs.orderPositions[order.ID]
			if !exists {
				originalPosition = -1
			}
			bs.queue.ReturnOrder(order, originalPosition)
			delete(bs.orderPositions, order.ID)
		}
	}

	return botToRemove, order
}

func (bs *BotScheduler) SubmitOrder(order *Order) {
	bs.mu.Lock()
	defer bs.mu.Unlock()

	position := bs.queue.Size()
	bs.orderPositions[order.ID] = position
	bs.queue.Enqueue(order)

	for _, bot := range bs.bots {
		if bot.IsIdle() {
			bs.tryAssignOrderLocked(bot)
			break
		}
	}
}

func (bs *BotScheduler) GetBotStatus() map[uint64]string {
	bs.mu.RLock()
	defer bs.mu.RUnlock()

	status := make(map[uint64]string)
	for id, bot := range bs.bots {
		status[id] = bot.Status.String()
	}
	return status
}

func (bs *BotScheduler) GetPendingOrders() []*Order {
	bs.mu.RLock()
	defer bs.mu.RUnlock()

	return bs.queue.GetPendingOrders()
}

func (bs *BotScheduler) GetCompleteOrders() []*Order {
	bs.mu.RLock()
	defer bs.mu.RUnlock()

	result := make([]*Order, len(bs.completeOrders))
	copy(result, bs.completeOrders)
	return result
}

func (bs *BotScheduler) ProcessLoop(ctx context.Context) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-bs.stopChan:
			return
		case <-ticker.C:
			bs.checkAndProcess()
		}
	}
}

func (bs *BotScheduler) Stop() {
	close(bs.stopChan)
}

func (bs *BotScheduler) checkAndProcess() {
	bs.mu.Lock()
	defer bs.mu.Unlock()

	for _, bot := range bs.bots {
		if bot.IsProcessing() {
			remaining := bot.GetRemainingTime()
			if remaining <= 0 {
				bs.completeOrderLocked(bot.ID)
			}
		}
	}
}

func (bs *BotScheduler) completeOrderLocked(botID uint64) {
	bot, exists := bs.bots[botID]
	if !exists {
		return
	}

	if !bot.IsProcessing() {
		return
	}

	order := bot.CompleteProcessing()
	if order != nil {
		bs.completeOrders = append(bs.completeOrders, order)
		delete(bs.orderPositions, order.ID)
	}

	bs.tryAssignOrderLocked(bot)
}

func (bs *BotScheduler) tryAssignOrderLocked(bot *Bot) {
	if !bot.IsIdle() {
		return
	}

	order := bs.queue.Dequeue()
	if order == nil {
		return
	}

	delete(bs.orderPositions, order.ID)
	err := bot.StartProcessing(order)
	if err != nil {
		bs.queue.ReturnOrder(order, -1)
	}
}
