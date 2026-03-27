package order

import (
	"testing"
)

func TestNewOrder(t *testing.T) {
	vipOrder := NewOrder(TypeVIP)
	if vipOrder == nil {
		t.Errorf("NewOrder should return a non-nil order")
	}
	if vipOrder.Type != TypeVIP {
		t.Errorf("Expected order type to be %s, got %s", TypeVIP, vipOrder.Type)
	}
	if vipOrder.Status != StatusPending {
		t.Errorf("Expected order status to be %s, got %s", StatusPending, vipOrder.Status)
	}
	if vipOrder.ID <= 0 {
		t.Errorf("Expected order ID to be positive, got %d", vipOrder.ID)
	}
	if vipOrder.CreateAt.IsZero() {
		t.Errorf("Expected order CreateAt to be set")
	}
	if !vipOrder.CompleteAt.IsZero() {
		t.Errorf("Expected order CompleteAt to be zero initially")
	}

	normalOrder := NewOrder(TypeNormal)
	if normalOrder == nil {
		t.Errorf("NewOrder should return a non-nil order")
	}
	if normalOrder.Type != TypeNormal {
		t.Errorf("Expected order type to be %s, got %s", TypeNormal, normalOrder.Type)
	}
	if normalOrder.Status != StatusPending {
		t.Errorf("Expected order status to be %s, got %s", StatusPending, normalOrder.Status)
	}
	if normalOrder.ID <= vipOrder.ID {
		t.Errorf("Expected order ID to be incrementing, got %d <= %d", normalOrder.ID, vipOrder.ID)
	}
}

func TestOrder_Complete(t *testing.T) {
	order := NewOrder(TypeNormal)
	initialStatus := order.Status
	initialCompleteAt := order.CompleteAt

	order.Complete()

	if order.Status != StatusComplete {
		t.Errorf("Expected order status to be %s, got %s", StatusComplete, order.Status)
	}

	if order.CompleteAt.IsZero() {
		t.Errorf("Expected order CompleteAt to be set")
	}

	if order.CompleteAt.Before(order.CreateAt) {
		t.Errorf("Expected order CompleteAt to be after or equal to CreateAt")
	}

	if !order.CompleteAt.After(initialCompleteAt) {
		t.Errorf("Expected order CompleteAt to be updated")
	}

	if initialStatus != StatusPending {
		t.Errorf("Expected initial status to be %s, got %s", StatusPending, initialStatus)
	}
}

func TestOrderIDIncrement(t *testing.T) {
	// test order ID incrementing
	order1 := NewOrder(TypeNormal)
	order2 := NewOrder(TypeVIP)
	order3 := NewOrder(TypeNormal)

	if order1.ID >= order2.ID {
		t.Errorf("Expected order1 ID (%d) to be less than order2 ID (%d)", order1.ID, order2.ID)
	}

	if order2.ID >= order3.ID {
		t.Errorf("Expected order2 ID (%d) to be less than order3 ID (%d)", order2.ID, order3.ID)
	}
}
