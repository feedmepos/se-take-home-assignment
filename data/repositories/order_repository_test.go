package repositories_test

import (
	"feedme-takehome/data/repositories"
	"feedme-takehome/domain/entities"
	"testing"
)

func TestCreateOrder(t *testing.T) {
	repo := repositories.NewInMemoryOrderRepository()

	order, err := repo.CreateOrder(entities.OrderTypeNormal)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if order.ID != 1 {
		t.Errorf("Expected order ID to be 1, got %d", order.ID)
	}
}

func TestGetPendingOrders(t *testing.T) {
	repo := repositories.NewInMemoryOrderRepository()

	repo.CreateOrder(entities.OrderTypeNormal)
	repo.CreateOrder(entities.OrderTypeVIP)
	repo.CreateOrder(entities.OrderTypeNormal)

	pending := repo.GetPendingOrders()

	if len(pending) != 3 {
		t.Errorf("Expected 3 pending orders, got %d", len(pending))
	}

	if pending[0].Type != entities.OrderTypeVIP {
		t.Errorf("Expected first order to be VIP, got %s", pending[0].Type)
	}

	if pending[1].Type != entities.OrderTypeNormal {
		t.Errorf("Expected second order to be NORMAL, got %s", pending[1].Type)
	}
}

func TestUpdateOrderStatus(t *testing.T) {
	repo := repositories.NewInMemoryOrderRepository()

	order, _ := repo.CreateOrder(entities.OrderTypeNormal)

	err := repo.UpdateOrderStatus(order.ID, entities.OrderStatusComplete)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	pending := repo.GetPendingOrders()
	if len(pending) != 0 {
		t.Errorf("Expected 0 pending orders after completion, got %d", len(pending))
	}
}
