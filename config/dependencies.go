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
	Output          interfaces.OutputWriter
}

func InitializeDependencies(
	orderRepo interfaces.OrderRepository,
	botRepo interfaces.BotRepository,
	output interfaces.OutputWriter,
	eventHandler interfaces.OrderProcessingEventHandler,
) *Dependencies {
	return &Dependencies{
		CreateOrderUC:   usecases.NewCreateOrderUseCase(orderRepo),
		AddBotUC:        usecases.NewAddBotUseCase(botRepo, orderRepo),
		RemoveBotUC:     usecases.NewRemoveBotUseCase(botRepo, orderRepo),
		ProcessOrdersUC: usecases.NewProcessOrdersUseCase(botRepo, orderRepo, eventHandler),
		GetStatusUC:     usecases.NewGetStatusUseCase(orderRepo, botRepo),
		Output:          output,
	}
}
