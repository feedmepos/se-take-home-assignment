package usecases_test

import (
	"errors"
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/mocks"
	"feedme-takehome/domain/usecases"
	"testing"
)

func TestAddBotUseCase(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()
	uc := usecases.NewAddBotUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if res == nil {
		t.Fatal("Expected result to be created, got nil")
	}

	if res.Bot == nil {
		t.Fatal("Expected bot to be created, got nil")
	}

	if res.Bot.ID != 1 {
		t.Errorf("Expected bot ID to be 1, got %d", res.Bot.ID)
	}

	// Verify mock was called
	if botRepo.AddBotCalls != 1 {
		t.Errorf("Expected AddBot to be called once, got %d", botRepo.AddBotCalls)
	}

	if orderRepo.GetPendingOrdersCalls != 1 {
		t.Errorf("Expected GetPendingOrders to be called once, got %d", orderRepo.GetPendingOrdersCalls)
	}
}

func TestWithPendingOrders(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	// Configure mock to return pending orders
	orderRepo.GetPendingOrdersFunc = func() []*entities.Order {
		return []*entities.Order{
			{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusPending},
			{ID: 2, Type: entities.OrderTypeVIP, Status: entities.OrderStatusPending},
		}
	}

	uc := usecases.NewAddBotUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if res.PendingCount != 2 {
		t.Errorf("Expected pending count to be 2, got %d", res.PendingCount)
	}
}

func TestError(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	// Configure mock to return an error
	botRepo.AddBotFunc = func() (*entities.Bot, error) {
		return nil, errors.New("failed to add bot")
	}

	uc := usecases.NewAddBotUseCase(botRepo, orderRepo)

	res, err := uc.Execute()
	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if res == nil {
		t.Fatal("Expected result to be returned even on error")
	}

	if res.Bot != nil {
		t.Error("Expected bot to be nil on error")
	}
}
