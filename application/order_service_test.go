package application

import (
	"testing"

	"mcdonalds-order-controller/domain"
	"mcdonalds-order-controller/infrastructure"
)

func TestOrderService_CreateNormalOrder(t *testing.T) {
	snowflake, err := infrastructure.NewSnowflake(1)
	if err != nil {
		t.Fatalf("Failed to create snowflake: %v", err)
	}
	scheduler := domain.NewBotScheduler()
	service := NewOrderService(snowflake, scheduler)

	order, err := service.CreateNormalOrder()
	if err != nil {
		t.Fatalf("CreateNormalOrder() error = %v", err)
	}

	if order == nil {
		t.Fatal("CreateNormalOrder() returned nil order")
	}

	if order.Type != domain.Normal {
		t.Errorf("Expected order type Normal, got %v", order.Type)
	}

	if order.Status != domain.OrderPending {
		t.Errorf("Expected status Pending, got %v", order.Status)
	}

	if order.ID == 0 {
		t.Error("Expected non-zero order ID")
	}
}

func TestOrderService_CreateVIPOrder(t *testing.T) {
	snowflake, err := infrastructure.NewSnowflake(1)
	if err != nil {
		t.Fatalf("Failed to create snowflake: %v", err)
	}
	scheduler := domain.NewBotScheduler()
	service := NewOrderService(snowflake, scheduler)

	order, err := service.CreateVIPOrder()
	if err != nil {
		t.Fatalf("CreateVIPOrder() error = %v", err)
	}

	if order == nil {
		t.Fatal("CreateVIPOrder() returned nil order")
	}

	if order.Type != domain.VIP {
		t.Errorf("Expected order type VIP, got %v", order.Type)
	}

	if order.Status != domain.OrderPending {
		t.Errorf("Expected status Pending, got %v", order.Status)
	}

	if order.ID == 0 {
		t.Error("Expected non-zero order ID")
	}
}

func TestOrderService_GetPendingOrders(t *testing.T) {
	snowflake, err := infrastructure.NewSnowflake(1)
	if err != nil {
		t.Fatalf("Failed to create snowflake: %v", err)
	}
	scheduler := domain.NewBotScheduler()
	service := NewOrderService(snowflake, scheduler)

	// Initially should be empty
	pending := service.GetPendingOrders()
	if len(pending) != 0 {
		t.Errorf("Expected 0 pending orders initially, got %d", len(pending))
	}

	// Create some orders
	_, _ = service.CreateNormalOrder()
	_, _ = service.CreateVIPOrder()
	_, _ = service.CreateNormalOrder()

	pending = service.GetPendingOrders()
	if len(pending) != 3 {
		t.Errorf("Expected 3 pending orders, got %d", len(pending))
	}

	// VIP orders should be at the front
	if pending[0].Type != domain.VIP {
		t.Errorf("Expected first order to be VIP, got %v", pending[0].Type)
	}
}

func TestOrderService_GetCompleteOrders(t *testing.T) {
	snowflake, err := infrastructure.NewSnowflake(1)
	if err != nil {
		t.Fatalf("Failed to create snowflake: %v", err)
	}
	scheduler := domain.NewBotScheduler()
	service := NewOrderService(snowflake, scheduler)

	// Initially should be empty
	complete := service.GetCompleteOrders()
	if len(complete) != 0 {
		t.Errorf("Expected 0 complete orders initially, got %d", len(complete))
	}

	// Create and complete an order manually
	order := domain.NewOrder(1, domain.Normal)
	order.MarkComplete()

	// Note: Complete orders are only added when bots finish processing
	// This test verifies the service delegates to scheduler correctly
	complete = service.GetCompleteOrders()
	if len(complete) != 0 {
		t.Errorf("Expected 0 complete orders (no processing done), got %d", len(complete))
	}
}
