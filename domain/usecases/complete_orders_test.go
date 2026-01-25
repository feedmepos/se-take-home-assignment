package usecases_test

import (
	"errors"
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/mocks"
	"feedme-takehome/domain/usecases"
	"testing"
)

func TestNoAssignments(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()
	uc := usecases.NewCompleteOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute(usecases.CompleteOrdersArgs{
		Assignments: []*usecases.AssignOrdersRes{},
	})
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(res) != 0 {
		t.Errorf("Expected no completions, got %d", len(res))
	}
}

func TestCompletesOrder(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	orderRepo.GetOrderByIDFunc = func(orderID int) *entities.Order {
		return &entities.Order{
			ID:     orderID,
			Type:   entities.OrderTypeNormal,
			Status: entities.OrderStatusComplete,
		}
	}

	uc := usecases.NewCompleteOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute(usecases.CompleteOrdersArgs{
		Assignments: []*usecases.AssignOrdersRes{
			{
				BotID: 1,
				Order: &entities.Order{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusProcessing},
			},
		},
	})
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(res) != 1 {
		t.Fatalf("Expected 1 completion, got %d", len(res))
	}

	if res[0].BotID != 1 {
		t.Errorf("Expected bot ID 1, got %d", res[0].BotID)
	}

	if res[0].Order.Status != entities.OrderStatusComplete {
		t.Errorf("Expected order status COMPLETE, got %s", res[0].Order.Status)
	}

	if len(orderRepo.UpdateOrderStatusCalls) != 1 {
		t.Fatalf("Expected UpdateOrderStatus to be called once, got %d", len(orderRepo.UpdateOrderStatusCalls))
	}

	statusCall := orderRepo.UpdateOrderStatusCalls[0]
	if statusCall.OrderID != 1 || statusCall.Status != entities.OrderStatusComplete {
		t.Errorf("Unexpected UpdateOrderStatus call: %+v", statusCall)
	}

	if len(botRepo.UpdateBotStatusCalls) != 1 {
		t.Fatalf("Expected UpdateBotStatus to be called once, got %d", len(botRepo.UpdateBotStatusCalls))
	}

	botCall := botRepo.UpdateBotStatusCalls[0]
	if botCall.BotID != 1 || botCall.IsProcessing || botCall.OrderID != 0 {
		t.Errorf("Unexpected UpdateBotStatus call: %+v", botCall)
	}
}

func TestCompletesMultipleOrders(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	orderRepo.GetOrderByIDFunc = func(orderID int) *entities.Order {
		return &entities.Order{
			ID:     orderID,
			Type:   entities.OrderTypeNormal,
			Status: entities.OrderStatusComplete,
		}
	}

	uc := usecases.NewCompleteOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute(usecases.CompleteOrdersArgs{
		Assignments: []*usecases.AssignOrdersRes{
			{
				BotID: 1,
				Order: &entities.Order{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusProcessing},
			},
			{
				BotID: 2,
				Order: &entities.Order{ID: 2, Type: entities.OrderTypeVIP, Status: entities.OrderStatusProcessing},
			},
		},
	})
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(res) != 2 {
		t.Errorf("Expected 2 completions, got %d", len(res))
	}

	if len(orderRepo.UpdateOrderStatusCalls) != 2 {
		t.Errorf("Expected UpdateOrderStatus to be called twice, got %d", len(orderRepo.UpdateOrderStatusCalls))
	}

	if len(botRepo.UpdateBotStatusCalls) != 2 {
		t.Errorf("Expected UpdateBotStatus to be called twice, got %d", len(botRepo.UpdateBotStatusCalls))
	}
}

func TestUpdateOrderStatusError(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	orderRepo.UpdateOrderStatusFunc = func(orderID int, status entities.OrderStatus) error {
		return errors.New("failed to update order status")
	}

	uc := usecases.NewCompleteOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute(usecases.CompleteOrdersArgs{
		Assignments: []*usecases.AssignOrdersRes{
			{
				BotID: 1,
				Order: &entities.Order{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusProcessing},
			},
		},
	})
	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if len(res) != 0 {
		t.Errorf("Expected no completions on error, got %d", len(res))
	}
}

func TestCompleteOrdersUpdateBotStatusError(t *testing.T) {
	orderRepo := mocks.NewMockOrderRepository()
	botRepo := mocks.NewMockBotRepository()

	botRepo.UpdateBotStatusFunc = func(botID int, isProcessing bool, orderID int) error {
		return errors.New("failed to update bot status")
	}

	uc := usecases.NewCompleteOrdersUseCase(botRepo, orderRepo)

	res, err := uc.Execute(usecases.CompleteOrdersArgs{
		Assignments: []*usecases.AssignOrdersRes{
			{
				BotID: 1,
				Order: &entities.Order{ID: 1, Type: entities.OrderTypeNormal, Status: entities.OrderStatusProcessing},
			},
		},
	})
	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if len(res) != 0 {
		t.Errorf("Expected no completions on error, got %d", len(res))
	}
}
