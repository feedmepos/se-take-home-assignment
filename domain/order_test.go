package domain

import (
	"testing"
	"time"
)

func TestOrder_Creation(t *testing.T) {
	now := time.Now()
	order := Order{
		ID:        1,
		Type:      Normal,
		Status:    OrderPending,
		CreatedAt: now,
		Position:  0,
	}

	if order.ID != 1 {
		t.Errorf("expected ID to be 1, got %d", order.ID)
	}
	if order.Type != Normal {
		t.Errorf("expected Type to be Normal, got %v", order.Type)
	}
	if order.Status != OrderPending {
		t.Errorf("expected Status to be Pending, got %v", order.Status)
	}
	if !order.CreatedAt.Equal(now) {
		t.Errorf("expected CreatedAt to be %v, got %v", now, order.CreatedAt)
	}
	if order.Position != 0 {
		t.Errorf("expected Position to be 0, got %d", order.Position)
	}
}

func TestOrder_MarkProcessing(t *testing.T) {
	order := Order{
		ID:     1,
		Type:   Normal,
		Status: OrderPending,
	}

	order.MarkProcessing()

	if order.Status != OrderProcessing {
		t.Errorf("expected Status to be Processing after MarkProcessing, got %v", order.Status)
	}
	if !order.Status.IsProcessing() {
		t.Error("expected IsProcessing to return true")
	}
}

func TestOrder_MarkComplete(t *testing.T) {
	order := Order{
		ID:     1,
		Type:   Normal,
		Status: OrderProcessing,
	}

	order.MarkComplete()

	if order.Status != OrderComplete {
		t.Errorf("expected Status to be Complete after MarkComplete, got %v", order.Status)
	}
	if !order.Status.IsComplete() {
		t.Error("expected IsComplete to return true")
	}
}

func TestOrder_IsVIP(t *testing.T) {
	tests := []struct {
		name     string
		order    Order
		expected bool
	}{
		{
			name:     "VIP order should return true",
			order:    Order{ID: 1, Type: VIP},
			expected: true,
		},
		{
			name:     "Normal order should return false",
			order:    Order{ID: 2, Type: Normal},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.order.IsVIP(); got != tt.expected {
				t.Errorf("IsVIP() = %v, expected %v", got, tt.expected)
			}
		})
	}
}
