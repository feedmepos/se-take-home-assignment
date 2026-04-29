package test

import (
	"testing"

	"github.com/exc/mcd-order-controller/mcd"
)

func TestOrderString(t *testing.T) {
	tests := []struct {
		name     string
		order    *mcd.Order
		expected string
	}{
		{
			name:     "Normal order",
			order:    &mcd.Order{ID: 1, Priority: mcd.Normal},
			expected: "#1 (NORMAL)",
		},
		{
			name:     "VIP order",
			order:    &mcd.Order{ID: 2, Priority: mcd.VIP},
			expected: "#2 (VIP)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.order.String()
			if result != tt.expected {
				t.Errorf("Order.String() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestOrderPriorityConstants(t *testing.T) {
	if mcd.Normal >= mcd.VIP {
		t.Error("Expected Normal priority to be less than VIP priority")
	}
}
