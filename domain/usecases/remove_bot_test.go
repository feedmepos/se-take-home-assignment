package usecases_test

import (
	"errors"
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/mocks"
	"feedme-takehome/domain/usecases"
	"testing"
)

func TestRemoveBotNoBots(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()
	uc := usecases.NewRemoveBotUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if res != nil {
		t.Errorf("Expected nil result when no bots, got %+v", res)
	}
}

func TestRemoveBotRemovesIdleBot(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetAllBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: false, CurrentOrderID: 0},
		}
	}

	uc := usecases.NewRemoveBotUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if res == nil {
		t.Fatal("Expected result, got nil")
	}

	if res.BotID != 1 {
		t.Errorf("Expected bot ID 1, got %d", res.BotID)
	}

	if res.WasProcessing {
		t.Error("Expected WasProcessing to be false")
	}

	if botRepo.RemoveBotCalls != 1 {
		t.Errorf("Expected RemoveBot to be called once, got %d", botRepo.RemoveBotCalls)
	}

	if len(botRepo.UpdateBotStatusCalls) != 0 {
		t.Errorf("Expected no UpdateBotStatus calls for idle bot, got %d", len(botRepo.UpdateBotStatusCalls))
	}
}

func TestRemoveBotRemovesNewestBot(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetAllBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: false, CurrentOrderID: 0},
			{ID: 3, IsProcessing: false, CurrentOrderID: 0},
			{ID: 2, IsProcessing: false, CurrentOrderID: 0},
		}
	}

	uc := usecases.NewRemoveBotUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if res.BotID != 3 {
		t.Errorf("Expected newest bot ID 3 to be removed, got %d", res.BotID)
	}
}

func TestRemoveBotRemovesProcessingBot(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetAllBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: true, CurrentOrderID: 5},
		}
	}

	uc := usecases.NewRemoveBotUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if res == nil {
		t.Fatal("Expected result, got nil")
	}

	if res.BotID != 1 {
		t.Errorf("Expected bot ID 1, got %d", res.BotID)
	}

	if !res.WasProcessing {
		t.Error("Expected WasProcessing to be true")
	}

	if res.OrderID != 5 {
		t.Errorf("Expected order ID 5, got %d", res.OrderID)
	}

	if len(orderRepo.UpdateOrderStatusCalls) != 1 {
		t.Fatalf("Expected UpdateOrderStatus to be called once, got %d", len(orderRepo.UpdateOrderStatusCalls))
	}

	statusCall := orderRepo.UpdateOrderStatusCalls[0]
	if statusCall.OrderID != 5 || statusCall.Status != entities.OrderStatusPending {
		t.Errorf("Expected order 5 to be set to PENDING, got %+v", statusCall)
	}

	if len(botRepo.UpdateBotStatusCalls) != 1 {
		t.Fatalf("Expected UpdateBotStatus to be called once, got %d", len(botRepo.UpdateBotStatusCalls))
	}

	botCall := botRepo.UpdateBotStatusCalls[0]
	if botCall.BotID != 1 || botCall.IsProcessing || botCall.OrderID != 0 {
		t.Errorf("Unexpected UpdateBotStatus call: %+v", botCall)
	}
}

func TestRemoveBotRemoveBotError(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetAllBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: false, CurrentOrderID: 0},
		}
	}

	botRepo.RemoveBotFunc = func() error {
		return errors.New("failed to remove bot")
	}

	uc := usecases.NewRemoveBotUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if res == nil {
		t.Fatal("Expected result to be returned even on error")
	}
}

func TestRemoveBotUpdateOrderStatusError(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetAllBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: true, CurrentOrderID: 5},
		}
	}

	orderRepo.UpdateOrderStatusFunc = func(orderID int, status entities.OrderStatus) error {
		return errors.New("failed to update order status")
	}

	uc := usecases.NewRemoveBotUseCase(botRepo, orderRepo)

	_, err := uc.Execute()
	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if botRepo.RemoveBotCalls != 0 {
		t.Errorf("Expected RemoveBot not to be called on error, got %d calls", botRepo.RemoveBotCalls)
	}
}

func TestRemoveBotUpdateBotStatusError(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetAllBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: true, CurrentOrderID: 5},
		}
	}

	botRepo.UpdateBotStatusFunc = func(botID int, isProcessing bool, orderID int) error {
		return errors.New("failed to update bot status")
	}

	uc := usecases.NewRemoveBotUseCase(botRepo, orderRepo)

	_, err := uc.Execute()
	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if botRepo.RemoveBotCalls != 0 {
		t.Errorf("Expected RemoveBot not to be called on error, got %d calls", botRepo.RemoveBotCalls)
	}
}
