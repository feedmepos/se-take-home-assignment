package usecases

import (
	"feedme-takehome/data/repositories"
	"feedme-takehome/domain/entities"
	"testing"
)

func TestCreateOrderUseCase_Execute(t *testing.T) {
	orderRepo := repositories.NewInMemoryOrderRepository()
	uc := NewCreateOrderUseCase(orderRepo)

	result, err := uc.Execute(entities.OrderTypeNormal)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if result == nil {
		t.Fatal("Expected result to be created, got nil")
	}

	if result.Order == nil {
		t.Fatal("Expected order to be created, got nil")
	}

	if result.Order.ID != 1 {
		t.Errorf("Expected order ID to be 1, got %d", result.Order.ID)
	}

	if result.Order.Type != entities.OrderTypeNormal {
		t.Errorf("Expected order type to be NORMAL, got %s", result.Order.Type)
	}

	if result.Order.Status != entities.OrderStatusPending {
		t.Errorf("Expected order status to be PENDING, got %s", result.Order.Status)
	}

	if result.PendingCount != 1 {
		t.Errorf("Expected pending count to be 1, got %d", result.PendingCount)
	}

	if result.NormalPendingCount != 1 {
		t.Errorf("Expected normal pending count to be 1, got %d", result.NormalPendingCount)
	}

	vipResult, err := uc.Execute(entities.OrderTypeVIP)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if vipResult.Order.ID != 2 {
		t.Errorf("Expected VIP order ID to be 2, got %d", vipResult.Order.ID)
	}

	if vipResult.Order.Type != entities.OrderTypeVIP {
		t.Errorf("Expected order type to be VIP, got %s", vipResult.Order.Type)
	}

	if vipResult.PendingCount != 2 {
		t.Errorf("Expected pending count to be 2, got %d", vipResult.PendingCount)
	}

	if vipResult.NormalPendingCount != 1 {
		t.Errorf("Expected normal pending count to be 1, got %d", vipResult.NormalPendingCount)
	}
}
