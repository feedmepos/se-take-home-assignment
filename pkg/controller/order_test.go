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
		{"Normal", normal, "Normal"},
		{"VIP", vip, "VIP"},
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
		{"Pending", pending, "PENDING"},
		{"Completed", completed, "COMPLETED"},
		{"Unknown", OrderStatus(99), "UNKNOWN"},
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
		id:        1,
		orderType: vip,
		status:    pending,
		createdAt: now,
	}

	if order.id != 1 {
		t.Errorf("Order.ID = %v, want 1", order.id)
	}
	if order.orderType != vip {
		t.Errorf("Order.Type = %v, want VIP", order.orderType)
	}
	if order.status != pending {
		t.Errorf("Order.Status = %v, want Pending", order.status)
	}
	if order.createdAt != now {
		t.Errorf("Order.CreatedAt = %v, want %v", order.createdAt, now)
	}
}
