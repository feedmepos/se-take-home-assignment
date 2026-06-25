package queue

import (
	"McDonald/internal/model"
	"testing"
)

func TestPriorityQueue_NormalOrders(t *testing.T) {
	q := NewPriorityQueue()

	order1 := &model.Order{ID: 1, Type: model.OrderTypeNormal}
	order2 := &model.Order{ID: 2, Type: model.OrderTypeNormal}

	q.Enqueue(order1)
	q.Enqueue(order2)

	if q.Len() != 2 {
		t.Errorf("Expected length 2, got %d", q.Len())
	}

	// Should dequeue in FIFO order for same type
	dequeued := q.Dequeue()
	if dequeued.ID != 1 {
		t.Errorf("Expected order 1, got %d", dequeued.ID)
	}
}

func TestPriorityQueue_VIPOrders(t *testing.T) {
	q := NewPriorityQueue()

	order1 := &model.Order{ID: 1, Type: model.OrderTypeVIP}
	order2 := &model.Order{ID: 2, Type: model.OrderTypeVIP}

	q.Enqueue(order1)
	q.Enqueue(order2)

	// VIP orders should maintain order among themselves
	dequeued := q.Dequeue()
	if dequeued.ID != 1 {
		t.Errorf("Expected order 1 first, got %d", dequeued.ID)
	}

	dequeued = q.Dequeue()
	if dequeued.ID != 2 {
		t.Errorf("Expected order 2 second, got %d", dequeued.ID)
	}
}

func TestPriorityQueue_VIPBeforeNormal(t *testing.T) {
	q := NewPriorityQueue()

	normal1 := &model.Order{ID: 1, Type: model.OrderTypeNormal}
	vip1 := &model.Order{ID: 2, Type: model.OrderTypeVIP}
	normal2 := &model.Order{ID: 3, Type: model.OrderTypeNormal}

	// Add in order: Normal, VIP, Normal
	q.Enqueue(normal1)
	q.Enqueue(vip1)
	q.Enqueue(normal2)

	// Should dequeue VIP first
	dequeued := q.Dequeue()
	if dequeued.ID != 2 {
		t.Errorf("Expected VIP order 2 first, got %d", dequeued.ID)
	}

	// Then Normal orders in order
	dequeued = q.Dequeue()
	if dequeued.ID != 1 {
		t.Errorf("Expected Normal order 1 second, got %d", dequeued.ID)
	}

	dequeued = q.Dequeue()
	if dequeued.ID != 3 {
		t.Errorf("Expected Normal order 3 third, got %d", dequeued.ID)
	}
}

func TestPriorityQueue_EmptyDequeue(t *testing.T) {
	q := NewPriorityQueue()

	order := q.Dequeue()
	if order != nil {
		t.Errorf("Expected nil for empty queue, got order %d", order.ID)
	}
}

func TestPriorityQueue_Peek(t *testing.T) {
	q := NewPriorityQueue()

	order1 := &model.Order{ID: 1, Type: model.OrderTypeNormal}
	order2 := &model.Order{ID: 2, Type: model.OrderTypeVIP}

	q.Enqueue(order1)
	q.Enqueue(order2)

	// Peek should return first order without removing
	peeked := q.Peek()
	if peeked.ID != 2 { // VIP should be first
		t.Errorf("Expected VIP order 2, got %d", peeked.ID)
	}

	// Queue should still have 2 orders
	if q.Len() != 2 {
		t.Errorf("Expected length 2, got %d", q.Len())
	}
}

func TestPriorityQueue_Remove(t *testing.T) {
	q := NewPriorityQueue()

	order1 := &model.Order{ID: 1, Type: model.OrderTypeNormal}
	order2 := &model.Order{ID: 2, Type: model.OrderTypeVIP}

	q.Enqueue(order1)
	q.Enqueue(order2)

	// Remove the first order (VIP)
	removed := q.Remove(order2)
	if !removed {
		t.Error("Expected to remove order 2")
	}

	if q.Len() != 1 {
		t.Errorf("Expected length 1, got %d", q.Len())
	}

	// Dequeue should now get Normal order
	dequeued := q.Dequeue()
	if dequeued.ID != 1 {
		t.Errorf("Expected order 1, got %d", dequeued.ID)
	}
}

func TestPriorityQueue_InsertAtEnd(t *testing.T) {
	q := NewPriorityQueue()

	normal1 := &model.Order{ID: 1, Type: model.OrderTypeNormal}
	vip1 := &model.Order{ID: 2, Type: model.OrderTypeVIP}

	q.Enqueue(normal1)
	q.Enqueue(vip1)

	// Insert a new Normal order at the end (simulating returnToPending)
	normal2 := &model.Order{ID: 3, Type: model.OrderTypeNormal}
	q.InsertAtEnd(normal2)

	// Order should be: VIP(2), Normal(1), Normal(3)
	dequeued := q.Dequeue()
	if dequeued.ID != 2 {
		t.Errorf("Expected VIP order 2 first, got %d", dequeued.ID)
	}

	dequeued = q.Dequeue()
	if dequeued.ID != 1 {
		t.Errorf("Expected Normal order 1 second, got %d", dequeued.ID)
	}

	dequeued = q.Dequeue()
	if dequeued.ID != 3 {
		t.Errorf("Expected Normal order 3 third, got %d", dequeued.ID)
	}
}
