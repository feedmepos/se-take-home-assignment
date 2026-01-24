package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
	"time"
)

type ProcessOrdersUseCase struct {
	botRepo      interfaces.BotRepository
	orderRepo    interfaces.OrderRepository
	eventHandler interfaces.OrderProcessingEventHandler
}

func NewProcessOrdersUseCase(botRepo interfaces.BotRepository, orderRepo interfaces.OrderRepository, eventHandler interfaces.OrderProcessingEventHandler) *ProcessOrdersUseCase {
	return &ProcessOrdersUseCase{
		botRepo:      botRepo,
		orderRepo:    orderRepo,
		eventHandler: eventHandler,
	}
}

func (uc *ProcessOrdersUseCase) StartProcessing() {
	idleBots := uc.botRepo.GetIdleBots()

	if !hasWorkToDo(idleBots, uc.orderRepo) {
		return
	}

	uc.assignOrdersToIdleBots(idleBots)
}

func hasWorkToDo(idleBots []*entities.Bot, orderRepo interfaces.OrderRepository) bool {
	if len(idleBots) > 0 {
		pendingCount := len(orderRepo.GetPendingOrders())
		if pendingCount == 0 {
			return false
		}
	}
	return true
}

func (uc *ProcessOrdersUseCase) assignOrdersToIdleBots(idleBots []*entities.Bot) {
	for _, bot := range idleBots {
		nextOrder := uc.orderRepo.ClaimNextPendingOrder()
		if nextOrder != nil {
			uc.assignOrderToBot(bot.ID, nextOrder)
			go uc.processOrder(bot.ID, nextOrder.ID)
		} else {
			break
		}
	}
}

func (uc *ProcessOrdersUseCase) assignOrderToBot(botID int, order *entities.Order) {
	uc.botRepo.UpdateBotStatus(botID, true, order.ID)

	if uc.eventHandler != nil {
		uc.eventHandler.OnOrderPickedUp(botID, order)
	}
}

func (uc *ProcessOrdersUseCase) processOrder(botID int, orderID int) {
	time.Sleep(10 * time.Second)

	bots := uc.botRepo.GetAllBots()
	botStillAssigned := isBotStillAssignedToOrder(bots, botID, orderID)

	if botStillAssigned {
		uc.completeOrder(botID, orderID)
		uc.StartProcessing()
	} else {
		uc.handleInterruptedOrder(orderID)
	}
}

func isBotStillAssignedToOrder(bots []*entities.Bot, botID int, orderID int) bool {
	for _, bot := range bots {
		if bot.ID == botID && bot.IsProcessing && bot.CurrentOrderID == orderID {
			return true
		}
	}
	return false
}

func (uc *ProcessOrdersUseCase) completeOrder(botID int, orderID int) {
	uc.orderRepo.UpdateOrderStatus(orderID, entities.OrderStatusComplete)
	uc.botRepo.UpdateBotStatus(botID, false, 0)

	if uc.eventHandler != nil {
		order := uc.orderRepo.GetOrderByID(orderID)
		uc.eventHandler.OnOrderCompleted(botID, order)
	}
}

func (uc *ProcessOrdersUseCase) handleInterruptedOrder(orderID int) {
	// Bot was removed, order status was already set to PENDING by RemoveBotUseCase
	// Check if another bot has already claimed this order
	bots := uc.botRepo.GetAllBots()
	for _, bot := range bots {
		if bot.IsProcessing && bot.CurrentOrderID == orderID {
			// Another bot has already claimed this order, nothing to do
			return
		}
	}

	// Only fire the interrupted event if no other bot has claimed the order
	if uc.eventHandler != nil {
		uc.eventHandler.OnOrderInterrupted(orderID)
	}
}
