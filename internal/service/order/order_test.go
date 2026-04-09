package order

import (
	"github.com/feedme/order-controller/internal/dao/order"
	"testing"
)

func TestCreateOrder(t *testing.T) {
	m := NewManager()

	normalOrder := m.CreateOrder(order.Normal)
	if normalOrder.Type != order.Normal {
		t.Errorf("Expected Normal order type, got %v", normalOrder.Type)
	}
	if normalOrder.Status != order.Pending {
		t.Errorf("Expected Pending status, got %v", normalOrder.Status)
	}

	vipOrder := m.CreateOrder(order.VIP)
	if vipOrder.Type != order.VIP {
		t.Errorf("Expected VIP order type, got %v", vipOrder.Type)
	}
}

func TestVIPPriority(t *testing.T) {
	m := NewManager()

	normal1 := m.CreateOrder(order.Normal)
	normal2 := m.CreateOrder(order.Normal)
	vip1 := m.CreateOrder(order.VIP)
	vip2 := m.CreateOrder(order.VIP)

	next := m.GetNextPendingOrder()
	if next.Id != vip1.Id {
		t.Errorf("Expected VIP order #%d first, got #%d", vip1.Id, next.Id)
	}

	next = m.GetNextPendingOrder()
	if next.Id != vip2.Id {
		t.Errorf("Expected VIP order #%d second, got #%d", vip2.Id, next.Id)
	}

	next = m.GetNextPendingOrder()
	if next.Id != normal1.Id {
		t.Errorf("Expected Normal order #%d third, got #%d", normal1.Id, next.Id)
	}

	next = m.GetNextPendingOrder()
	if next.Id != normal2.Id {
		t.Errorf("Expected Normal order #%d fourth, got #%d", normal2.Id, next.Id)
	}
}

func TestReturnOrderToPending(t *testing.T) {
	m := NewManager()

	_ = m.CreateOrder(order.Normal)
	vip1 := m.CreateOrder(order.VIP)
	_ = m.CreateOrder(order.VIP)
	_ = m.CreateOrder(order.Normal)

	processVIP1 := m.GetNextPendingOrder()

	m.ReturnOrderToPending(processVIP1)

	next := m.GetNextPendingOrder()
	if next.Id != vip1.Id {
		t.Errorf("Expected returned VIP order #%d, got #%d", vip1.Id, next.Id)
	}
}

func TestCompleteOrder(t *testing.T) {
	m := NewManager()

	o := m.CreateOrder(order.Normal)
	m.GetNextPendingOrder()
	m.CompleteOrder(o.Id)

	completed, exists := m.GetOrder(o.Id)
	if !exists {
		t.Error("Order should exist")
	}
	if completed.Status != order.Complete {
		t.Errorf("Expected Complete status, got %v", completed.Status)
	}
}
