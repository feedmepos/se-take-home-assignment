package order

import (
	"testing"
)

func TestNewOrder(t *testing.T) {
	order := NewOrder(1, Normal)
	
	if order.ID != 1 {
		t.Errorf("Expected order ID 1, got %d", order.ID)
	}
	
	if order.Type != Normal {
		t.Errorf("Expected Normal order type, got %v", order.Type)
	}
	
	if order.Status != PENDING {
		t.Errorf("Expected PENDING status, got %v", order.Status)
	}
	
	if order.CreatedAt.IsZero() {
		t.Error("Expected CreatedAt to be set")
	}
}

func TestOrderStatusTransitions(t *testing.T) {
	order := NewOrder(1, VIP)
	
	// Test PENDING -> PROCESSING
	order.SetProcessing()
	if order.Status != PROCESSING {
		t.Errorf("Expected PROCESSING status, got %v", order.Status)
	}
	
	// Test PROCESSING -> COMPLETE
	order.SetComplete()
	if order.Status != COMPLETE {
		t.Errorf("Expected COMPLETE status, got %v", order.Status)
	}
	
	if order.CompletedAt.IsZero() {
		t.Error("Expected CompletedAt to be set")
	}
	
	// Test returning to PENDING
	order.SetPending()
	if order.Status != PENDING {
		t.Errorf("Expected PENDING status, got %v", order.Status)
	}
}

func TestIsVIP(t *testing.T) {
	vipOrder := NewOrder(1, VIP)
	if !vipOrder.IsVIP() {
		t.Error("Expected VIP order to return true for IsVIP()")
	}
	
	normalOrder := NewOrder(2, Normal)
	if normalOrder.IsVIP() {
		t.Error("Expected Normal order to return false for IsVIP()")
	}
}

func TestOrderTypeString(t *testing.T) {
	if Normal.String() != "Normal" {
		t.Errorf("Expected 'Normal', got '%s'", Normal.String())
	}
	
	if VIP.String() != "VIP" {
		t.Errorf("Expected 'VIP', got '%s'", VIP.String())
	}
}

func TestOrderStatusString(t *testing.T) {
	if PENDING.String() != "PENDING" {
		t.Errorf("Expected 'PENDING', got '%s'", PENDING.String())
	}
	
	if PROCESSING.String() != "PROCESSING" {
		t.Errorf("Expected 'PROCESSING', got '%s'", PROCESSING.String())
	}
	
	if COMPLETE.String() != "COMPLETE" {
		t.Errorf("Expected 'COMPLETE', got '%s'", COMPLETE.String())
	}
}
