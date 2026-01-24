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

func (uc *ProcessOrdersUseCase) AssignOrdersToIdleBots() []*ProcessResult {
	idleBots := uc.botRepo.GetIdleBots()
	var results []*ProcessResult

	for _, bot := range idleBots {
		nextOrder := uc.orderRepo.ClaimNextPendingOrder()
		if nextOrder == nil {
			break
		}
		uc.botRepo.UpdateBotStatus(bot.ID, true, nextOrder.ID)
		results = append(results, &ProcessResult{
			BotID: bot.ID,
			Order: nextOrder,
		})
	}

	return results
}

func (uc *ProcessOrdersUseCase) CompleteProcessing(results []*ProcessResult) []*ProcessResult {
	var completed []*ProcessResult

	for _, r := range results {
		uc.orderRepo.UpdateOrderStatus(r.Order.ID, entities.OrderStatusComplete)
		uc.botRepo.UpdateBotStatus(r.BotID, false, 0)
		completed = append(completed, &ProcessResult{
			BotID: r.BotID,
			Order: uc.orderRepo.GetOrderByID(r.Order.ID),
		})
	}

	return completed
}

func (uc *ProcessOrdersUseCase) HasIdleBot() bool {
	return len(uc.botRepo.GetIdleBots()) > 0
}

func (uc *ProcessOrdersUseCase) HasPendingOrders() bool {
	return len(uc.orderRepo.GetPendingOrders()) > 0
}
