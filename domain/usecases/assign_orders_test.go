package usecases_test

import (
	"errors"
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/mocks"
	"feedme-takehome/domain/usecases"
	"testing"
)

func TestNoIdleBots(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()
	uc := usecases.NewAssignOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(res) != 0 {
		t.Errorf("Expected no assignments, got %d", len(res))
	}

	if botRepo.GetIdleBotsCalls != 1 {
		t.Errorf("Expected GetIdleBots to be called once, got %d", botRepo.GetIdleBotsCalls)
	}
}

func TestNoPendingOrders(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetIdleBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: false},
		}
	}

	uc := usecases.NewAssignOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(res) != 0 {
		t.Errorf("Expected no assignments, got %d", len(res))
	}
}

func TestAssignsOrderToBot(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetIdleBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: false},
		}
	}

	orderRepo.ClaimNextPendingOrderFunc = func() *entities.Order {
		return &entities.Order{
			ID:     1,
			Type:   entities.OrderTypeNormal,
			Status: entities.OrderStatusProcessing,
		}
	}

	uc := usecases.NewAssignOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(res) != 1 {
		t.Fatalf("Expected 1 assignment, got %d", len(res))
	}

	if res[0].BotID != 1 {
		t.Errorf("Expected bot ID 1, got %d", res[0].BotID)
	}

	if res[0].Order.ID != 1 {
		t.Errorf("Expected order ID 1, got %d", res[0].Order.ID)
	}

	if len(botRepo.UpdateBotStatusCalls) != 1 {
		t.Fatalf("Expected UpdateBotStatus to be called once, got %d", len(botRepo.UpdateBotStatusCalls))
	}

	call := botRepo.UpdateBotStatusCalls[0]
	if call.BotID != 1 || !call.IsProcessing || call.OrderID != 1 {
		t.Errorf("Unexpected UpdateBotStatus call: %+v", call)
	}
}

func TestAssignsMultipleOrders(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetIdleBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: false},
			{ID: 2, IsProcessing: false},
		}
	}

	orderCount := 0
	orderRepo.ClaimNextPendingOrderFunc = func() *entities.Order {
		orderCount++
		if orderCount > 2 {
			return nil
		}
		return &entities.Order{
			ID:     orderCount,
			Type:   entities.OrderTypeNormal,
			Status: entities.OrderStatusProcessing,
		}
	}

	uc := usecases.NewAssignOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(res) != 2 {
		t.Fatalf("Expected 2 assignments, got %d", len(res))
	}

	if len(botRepo.UpdateBotStatusCalls) != 2 {
		t.Errorf("Expected UpdateBotStatus to be called twice, got %d", len(botRepo.UpdateBotStatusCalls))
	}
}

func TestStopsWhenNoMoreOrders(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetIdleBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: false},
			{ID: 2, IsProcessing: false},
			{ID: 3, IsProcessing: false},
		}
	}

	orderCount := 0
	orderRepo.ClaimNextPendingOrderFunc = func() *entities.Order {
		orderCount++
		if orderCount > 1 {
			return nil
		}
		return &entities.Order{
			ID:     orderCount,
			Type:   entities.OrderTypeNormal,
			Status: entities.OrderStatusProcessing,
		}
	}

	uc := usecases.NewAssignOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(res) != 1 {
		t.Errorf("Expected 1 assignment, got %d", len(res))
	}
}

func TestUpdateBotStatusError(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetIdleBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: false},
		}
	}

	orderRepo.ClaimNextPendingOrderFunc = func() *entities.Order {
		return &entities.Order{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusProcessing}
	}

	botRepo.UpdateBotStatusFunc = func(botID int, isProcessing bool, orderID int) error {
		return errors.New("failed to update bot status")
	}

	uc := usecases.NewAssignOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if len(res) != 0 {
		t.Errorf("Expected no assignments on error, got %d", len(res))
	}
}
