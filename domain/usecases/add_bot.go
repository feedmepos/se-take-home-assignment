package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
)

type AddBotUseCase struct {
	botRepo   interfaces.BotRepository
	orderRepo interfaces.OrderRepository
}

type AddBotResultArgs struct{}

type AddBotResultRes struct {
	Bot          *entities.Bot
	PendingCount int
}

func (uc *AddBotUseCase) Execute() (res *AddBotResultRes, err error) {
	bot, err := uc.botRepo.AddBot()
	if err != nil {
		res = &AddBotResultRes{
			nil,
			0,
		}
		return
	}

	pendingCount := len(uc.orderRepo.GetPendingOrders())
	res = &AddBotResultRes{
		bot,
		pendingCount,
	}

	return
}

func NewAddBotUseCase(botRepo interfaces.BotRepository, orderRepo interfaces.OrderRepository) *AddBotUseCase {
	return &AddBotUseCase{
		botRepo:   botRepo,
		orderRepo: orderRepo,
	}
}
