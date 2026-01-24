package config

import (
	"feedme-takehome/domain/interfaces"
	"feedme-takehome/domain/usecases"
)

type Dependencies struct {
	CreateOrderUC   *usecases.CreateOrderUseCase
	AddBotUC        *usecases.AddBotUseCase
	RemoveBotUC     *usecases.RemoveBotUseCase
	ProcessOrdersUC *usecases.ProcessOrdersUseCase
	GetStatusUC     *usecases.GetStatusUseCase
}

func InitializeDependencies(
	orderRepo interfaces.OrderRepository,
	botRepo interfaces.BotRepository,
) *Dependencies {
	return &Dependencies{
		CreateOrderUC:   usecases.NewCreateOrderUseCase(orderRepo),
		AddBotUC:        usecases.NewAddBotUseCase(botRepo, orderRepo),
		RemoveBotUC:     usecases.NewRemoveBotUseCase(botRepo, orderRepo),
		ProcessOrdersUC: usecases.NewProcessOrdersUseCase(botRepo, orderRepo),
		GetStatusUC:     usecases.NewGetStatusUseCase(orderRepo, botRepo),
	}
}
