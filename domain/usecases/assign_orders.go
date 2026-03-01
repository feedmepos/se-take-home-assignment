package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
)

type AssignOrdersUseCase struct {
	botRepo   interfaces.BotRepository
	orderRepo interfaces.OrderRepository
}

type AssignOrdersArgs struct{}

type AssignOrdersRes struct {
	BotID int
	Order *entities.Order
}

func (uc *AssignOrdersUseCase) Execute() (res []*AssignOrdersRes, err error) {
	idleBots := uc.botRepo.GetIdleBots()
	res = make([]*AssignOrdersRes, 0)

	for _, bot := range idleBots {
		nextOrder := uc.orderRepo.ClaimNextPendingOrder()
		if nextOrder == nil {
			break
		}
		err = uc.botRepo.UpdateBotStatus(bot.ID, true, nextOrder.ID)
		if err != nil {
			return
		}
		res = append(res, &AssignOrdersRes{
			BotID: bot.ID,
			Order: nextOrder,
		})
	}

	return
}

func NewAssignOrdersUseCase(botRepo interfaces.BotRepository, orderRepo interfaces.OrderRepository) *AssignOrdersUseCase {
	return &AssignOrdersUseCase{
		botRepo:   botRepo,
		orderRepo: orderRepo,
	}
}
