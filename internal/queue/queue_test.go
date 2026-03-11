package queue

import (
	"mcdonalds-order-system/internal/model"
	"testing"
)

func TestEnqueueNormalOrder(t *testing.T) {
	q := NewOrderQueue()

	order1 := model.NewOrder(1, model.OrderTypeNormal)
	order2 := model.NewOrder(2, model.OrderTypeNormal)

	q.Enqueue(order1)
	q.Enqueue(order2)

	if q.Size() != 2 {
		t.Errorf("Expected size 2, got %d", q.Size())
	}

	// Dequeue should return order1 first (FIFO)
	first := q.Dequeue()
	if first.ID != 1 {
		t.Errorf("Expected order 1, got order %d", first.ID)
	}
}

func TestEnqueueVIPOrder(t *testing.T) {
	q := NewOrderQueue()

	normal1 := model.NewOrder(1, model.OrderTypeNormal)
	normal2 := model.NewOrder(2, model.OrderTypeNormal)
	vip1 := model.NewOrder(3, model.OrderTypeVIP)

	q.Enqueue(normal1)
	q.Enqueue(normal2)
	q.Enqueue(vip1) // VIP should be placed before all Normal orders

	// First dequeue should return VIP
	first := q.Dequeue()
	if first.ID != 3 {
		t.Errorf("Expected VIP order 3 first, got order %d", first.ID)
	}
	if first.Type != model.OrderTypeVIP {
		t.Errorf("Expected VIP type, got %s", first.Type)
	}
}

func TestVIPOrderPriority(t *testing.T) {
	q := NewOrderQueue()

	normal1 := model.NewOrder(1, model.OrderTypeNormal)
	vip1 := model.NewOrder(2, model.OrderTypeVIP)
	normal2 := model.NewOrder(3, model.OrderTypeNormal)
	vip2 := model.NewOrder(4, model.OrderTypeVIP)

	q.Enqueue(normal1)
	q.Enqueue(vip1)
	q.Enqueue(normal2)
	q.Enqueue(vip2)

	// Expected order: VIP1, VIP2, Normal1, Normal2
	orders := q.GetAll()
	expectedOrder := []int{2, 4, 1, 3}

	for i, expected := range expectedOrder {
		if orders[i].ID != expected {
			t.Errorf("Position %d: expected order %d, got order %d", i, expected, orders[i].ID)
		}
	}
}

func TestEnqueueFront(t *testing.T) {
	q := NewOrderQueue()

	order1 := model.NewOrder(1, model.OrderTypeNormal)
	order2 := model.NewOrder(2, model.OrderTypeNormal)

	q.Enqueue(order1)
	q.EnqueueFront(order2) // Should be placed at front

	first := q.Dequeue()
	if first.ID != 2 {
		t.Errorf("Expected order 2 (front), got order %d", first.ID)
	}
}

func TestDequeueEmpty(t *testing.T) {
	q := NewOrderQueue()

	result := q.Dequeue()
	if result != nil {
		t.Errorf("Expected nil for empty queue, got %v", result)
	}
}

func TestIsEmpty(t *testing.T) {
	q := NewOrderQueue()

	if !q.IsEmpty() {
		t.Error("Expected empty queue")
	}

	q.Enqueue(model.NewOrder(1, model.OrderTypeNormal))

	if q.IsEmpty() {
		t.Error("Expected non-empty queue")
	}
}
