package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
)

type AddBotUseCase struct {
	botRepo   interfaces.BotRepository
	orderRepo interfaces.OrderRepository
}

func NewAddBotUseCase(botRepo interfaces.BotRepository, orderRepo interfaces.OrderRepository) *AddBotUseCase {
	return &AddBotUseCase{
		botRepo:   botRepo,
		orderRepo: orderRepo,
	}
}

func (uc *AddBotUseCase) Execute() (*entities.Bot, int, error) {
	bot, err := uc.botRepo.AddBot()
	if err != nil {
		return nil, 0, err
	}

	pendingCount := len(uc.orderRepo.GetPendingOrders())
	return bot, pendingCount, nil
}
