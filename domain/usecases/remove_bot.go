package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
)

type RemoveBotResult struct {
	BotID         int
	OrderID       int
	WasProcessing bool
}

type RemoveBotUseCase struct {
	botRepo   interfaces.BotRepository
	orderRepo interfaces.OrderRepository
}

func NewRemoveBotUseCase(botRepo interfaces.BotRepository, orderRepo interfaces.OrderRepository) *RemoveBotUseCase {
	return &RemoveBotUseCase{
		botRepo:   botRepo,
		orderRepo: orderRepo,
	}
}

func (uc *RemoveBotUseCase) Execute() (*RemoveBotResult, error) {
	bots := uc.botRepo.GetAllBots()
	if len(bots) == 0 {
		return nil, nil
	}

	newestBot := findNewestBot(bots)
	result := buildRemoveBotResult(newestBot)
	
	if newestBot.IsProcessing {
		uc.releaseProcessingOrder(newestBot, result)
	}

	err := uc.botRepo.RemoveBot()
	return result, err
}

func findNewestBot(bots []*entities.Bot) *entities.Bot {
	newestBot := bots[0]
	for _, bot := range bots {
		if bot.ID > newestBot.ID {
			newestBot = bot
		}
	}
	return newestBot
}

func buildRemoveBotResult(bot *entities.Bot) *RemoveBotResult {
	return &RemoveBotResult{
		BotID:         bot.ID,
		WasProcessing: bot.IsProcessing,
	}
}

func (uc *RemoveBotUseCase) releaseProcessingOrder(bot *entities.Bot, result *RemoveBotResult) {
	result.OrderID = bot.CurrentOrderID
	uc.orderRepo.UpdateOrderStatus(result.OrderID, entities.OrderStatusPending)
	uc.botRepo.UpdateBotStatus(bot.ID, false, 0)
}
