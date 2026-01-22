package controller

import (
	"testing"
	"time"
)

func TestOrderTypeString(t *testing.T) {
	tests := []struct {
		name      string
		orderType OrderType
		expected  string
	}{
		{"Normal", Normal, "Normal"},
		{"VIP", VIP, "VIP"},
		{"Unknown", OrderType(99), "Unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.orderType.String(); got != tt.expected {
				t.Errorf("OrderType.String() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestOrderStatusString(t *testing.T) {
	tests := []struct {
		name        string
		orderStatus OrderStatus
		expected    string
	}{
		{"Pending", Pending, "Pending"},
		{"Completed", Completed, "Completed"},
		{"Unknown", OrderStatus(99), "Unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.orderStatus.String(); got != tt.expected {
				t.Errorf("OrderStatus.String() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestOrderCreation(t *testing.T) {
	now := time.Now()
	order := Order{
		ID:        1,
		Type:      VIP,
		Status:    Pending,
		CreatedAt: now,
	}

	if order.ID != 1 {
		t.Errorf("Order.ID = %v, want 1", order.ID)
	}
	if order.Type != VIP {
		t.Errorf("Order.Type = %v, want VIP", order.Type)
	}
	if order.Status != Pending {
		t.Errorf("Order.Status = %v, want Pending", order.Status)
	}
	if order.CreatedAt != now {
		t.Errorf("Order.CreatedAt = %v, want %v", order.CreatedAt, now)
	}
}
