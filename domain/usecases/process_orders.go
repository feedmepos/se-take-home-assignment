package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
)

type ProcessResult struct {
	BotID int
	Order *entities.Order
}

type ProcessOrdersUseCase struct {
	botRepo   interfaces.BotRepository
	orderRepo interfaces.OrderRepository
}

func NewProcessOrdersUseCase(botRepo interfaces.BotRepository, orderRepo interfaces.OrderRepository) *ProcessOrdersUseCase {
	return &ProcessOrdersUseCase{
		botRepo:   botRepo,
		orderRepo: orderRepo,
	}
}

func (uc *ProcessOrdersUseCase) ProcessNextOrder() *ProcessResult {
	idleBots := uc.botRepo.GetIdleBots()
	if len(idleBots) == 0 {
		return nil
	}

	nextOrder := uc.orderRepo.ClaimNextPendingOrder()
	if nextOrder == nil {
		return nil
	}

	bot := idleBots[0]
	uc.botRepo.UpdateBotStatus(bot.ID, true, nextOrder.ID)
	uc.orderRepo.UpdateOrderStatus(nextOrder.ID, entities.OrderStatusComplete)
	uc.botRepo.UpdateBotStatus(bot.ID, false, 0)

	return &ProcessResult{
		BotID: bot.ID,
		Order: uc.orderRepo.GetOrderByID(nextOrder.ID),
	}
}

func (uc *ProcessOrdersUseCase) HasIdleBot() bool {
	return len(uc.botRepo.GetIdleBots()) > 0
}

func (uc *ProcessOrdersUseCase) HasPendingOrders() bool {
	return len(uc.orderRepo.GetPendingOrders()) > 0
}
