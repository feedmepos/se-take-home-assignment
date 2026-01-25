package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
)

type RemoveBotUseCase struct {
	botRepo   interfaces.BotRepository
	orderRepo interfaces.OrderRepository
}

type RemoveBotArgs struct{}

type RemoveBotRes struct {
	BotID         int
	OrderID       int
	WasProcessing bool
}

func (uc *RemoveBotUseCase) Execute() (res *RemoveBotRes, err error) {
	bots := uc.botRepo.GetAllBots()
	if len(bots) == 0 {
		return nil, nil
	}

	newestBot := findNewestBot(bots)
	res = buildRemoveBotResult(newestBot)

	if newestBot.IsProcessing {
		err = uc.releaseProcessingOrder(newestBot, res)
		if err != nil {
			return
		}
	}

	err = uc.botRepo.RemoveBot()

	return
}

func findNewestBot(bots []*entities.Bot) (newestBot *entities.Bot) {
	newestBot = bots[0]
	for _, bot := range bots {
		if bot.ID > newestBot.ID {
			newestBot = bot
		}
	}

	return
}

func buildRemoveBotResult(bot *entities.Bot) (res *RemoveBotRes) {
	res = &RemoveBotRes{
		BotID:         bot.ID,
		WasProcessing: bot.IsProcessing,
	}

	return
}

func (uc *RemoveBotUseCase) releaseProcessingOrder(bot *entities.Bot, res *RemoveBotRes) (err error) {
	res.OrderID = bot.CurrentOrderID
	err = uc.orderRepo.UpdateOrderStatus(res.OrderID, entities.OrderStatusPending)
	if err != nil {
		return
	}
	err = uc.botRepo.UpdateBotStatus(bot.ID, false, 0)

	return
}

func NewRemoveBotUseCase(botRepo interfaces.BotRepository, orderRepo interfaces.OrderRepository) *RemoveBotUseCase {
	return &RemoveBotUseCase{
		botRepo:   botRepo,
		orderRepo: orderRepo,
	}
}
