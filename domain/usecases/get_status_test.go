package usecases_test

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/mocks"
	"feedme-takehome/domain/usecases"
	"testing"
	"time"
)

func TestGetStatusUseCaseEmpty(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()
	uc := usecases.NewGetStatusUseCase(orderRepo, botRepo)

	res := uc.Execute()

	if res == nil {
		t.Fatal("Expected result, got nil")
	}

	if len(res.PendingOrders) != 0 {
		t.Errorf("Expected no pending orders, got %d", len(res.PendingOrders))
	}

	if len(res.ProcessingOrders) != 0 {
		t.Errorf("Expected no processing orders, got %d", len(res.ProcessingOrders))
	}

	if len(res.CompleteOrders) != 0 {
		t.Errorf("Expected no complete orders, got %d", len(res.CompleteOrders))
	}

	if len(res.Bots) != 0 {
		t.Errorf("Expected no bots, got %d", len(res.Bots))
	}

	if res.IdleBotCount != 0 {
		t.Errorf("Expected idle bot count 0, got %d", res.IdleBotCount)
	}
}

func TestGetStatusWithPendingOrders(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	orderRepo.GetAllOrdersFunc = func() []*entities.Order {
		return []*entities.Order{
			{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusPending},
			{ID: 2, Type: entities.OrderTypeVIP, Status: entities.OrderStatusPending},
		}
	}

	uc := usecases.NewGetStatusUseCase(orderRepo, botRepo)

	res := uc.Execute()

	if len(res.PendingOrders) != 2 {
		t.Errorf("Expected 2 pending orders, got %d", len(res.PendingOrders))
	}

	if res.PendingOrders[0].Type != entities.OrderTypeVIP {
		t.Error("Expected VIP orders to be sorted first")
	}
}

func TestGetStatusWithProcessingOrders(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	orderRepo.GetAllOrdersFunc = func() []*entities.Order {
		return []*entities.Order{
			{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusProcessing},
		}
	}

	botRepo.GetAllBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: true, CurrentOrderID: 1},
		}
	}

	uc := usecases.NewGetStatusUseCase(orderRepo, botRepo)

	res := uc.Execute()

	if len(res.ProcessingOrders) != 1 {
		t.Fatalf("Expected 1 processing order, got %d", len(res.ProcessingOrders))
	}

	if res.ProcessingOrders[0].BotID != 1 {
		t.Errorf("Expected bot ID 1, got %d", res.ProcessingOrders[0].BotID)
	}

	if res.ProcessingOrders[0].Order.ID != 1 {
		t.Errorf("Expected order ID 1, got %d", res.ProcessingOrders[0].Order.ID)
	}
}

func TestGetStatusWithCompleteOrders(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	time1 := time.Now().Add(-2 * time.Hour)
	time2 := time.Now().Add(-1 * time.Hour)

	orderRepo.GetAllOrdersFunc = func() []*entities.Order {
		return []*entities.Order{
			{ID: 2, Type: entities.OrderTypeNormal, Status: entities.OrderStatusComplete, CompletedAt: &time2},
			{ID: 1, Type: entities.OrderTypeVIP, Status: entities.OrderStatusComplete, CompletedAt: &time1},
		}
	}

	uc := usecases.NewGetStatusUseCase(orderRepo, botRepo)

	res := uc.Execute()

	if len(res.CompleteOrders) != 2 {
		t.Fatalf("Expected 2 complete orders, got %d", len(res.CompleteOrders))
	}

	if res.CompleteOrders[0].ID != 1 {
		t.Error("Expected complete orders to be sorted by completion time")
	}
}

func TestGetStatusWithBots(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.GetAllBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: false, CurrentOrderID: 0},
			{ID: 2, IsProcessing: true, CurrentOrderID: 1},
			{ID: 3, IsProcessing: false, CurrentOrderID: 0},
		}
	}

	uc := usecases.NewGetStatusUseCase(orderRepo, botRepo)

	res := uc.Execute()

	if len(res.Bots) != 3 {
		t.Errorf("Expected 3 bots, got %d", len(res.Bots))
	}

	if res.IdleBotCount != 2 {
		t.Errorf("Expected 2 idle bots, got %d", res.IdleBotCount)
	}
}

func TestGetStatusProcessingOrderWithoutBot(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	orderRepo.GetAllOrdersFunc = func() []*entities.Order {
		return []*entities.Order{
			{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusProcessing},
		}
	}

	uc := usecases.NewGetStatusUseCase(orderRepo, botRepo)

	res := uc.Execute()

	if len(res.ProcessingOrders) != 0 {
		t.Errorf("Expected 0 processing orders (no bot assigned), got %d", len(res.ProcessingOrders))
	}

	if len(res.PendingOrders) != 1 {
		t.Errorf("Expected 1 pending order (orphaned processing order), got %d", len(res.PendingOrders))
	}
}

func TestGetStatusMixedOrderStatuses(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	completedTime := time.Now()

	orderRepo.GetAllOrdersFunc = func() []*entities.Order {
		return []*entities.Order{
			{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusPending},
			{ID: 2, Type: entities.OrderTypeVIP, Status: entities.OrderStatusProcessing},
			{ID: 3, Type: entities.OrderTypeNormal, Status: entities.OrderStatusComplete, CompletedAt: &completedTime},
		}
	}

	botRepo.GetAllBotsFunc = func() []*entities.Bot {
		return []*entities.Bot{
			{ID: 1, IsProcessing: true, CurrentOrderID: 2},
		}
	}

	uc := usecases.NewGetStatusUseCase(orderRepo, botRepo)

	res := uc.Execute()

	if len(res.PendingOrders) != 1 {
		t.Errorf("Expected 1 pending order, got %d", len(res.PendingOrders))
	}

	if len(res.ProcessingOrders) != 1 {
		t.Errorf("Expected 1 processing order, got %d", len(res.ProcessingOrders))
	}

	if len(res.CompleteOrders) != 1 {
		t.Errorf("Expected 1 complete order, got %d", len(res.CompleteOrders))
	}
}

func TestGetStatusVIPOrdersSortedFirst(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	orderRepo.GetAllOrdersFunc = func() []*entities.Order {
		return []*entities.Order{
			{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusPending},
			{ID: 2, Type: entities.OrderTypeNormal, Status: entities.OrderStatusPending},
			{ID: 3, Type: entities.OrderTypeVIP, Status: entities.OrderStatusPending},
			{ID: 4, Type: entities.OrderTypeVIP, Status: entities.OrderStatusPending},
		}
	}

	uc := usecases.NewGetStatusUseCase(orderRepo, botRepo)

	res := uc.Execute()

	if len(res.PendingOrders) != 4 {
		t.Fatalf("Expected 4 pending orders, got %d", len(res.PendingOrders))
	}

	if res.PendingOrders[0].Type != entities.OrderTypeVIP || res.PendingOrders[1].Type != entities.OrderTypeVIP {
		t.Error("Expected VIP orders to be sorted first")
	}

	if res.PendingOrders[2].Type != entities.OrderTypeNormal || res.PendingOrders[3].Type != entities.OrderTypeNormal {
		t.Error("Expected normal orders after VIP orders")
	}
}
