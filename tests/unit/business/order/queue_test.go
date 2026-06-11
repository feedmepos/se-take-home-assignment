package order_test

import (
	"testing"

	"order/internal/business/order"
)

func TestQueue_VIPBeforeNormal(t *testing.T) {
	q := order.NewQueue()
	q.Push(&order.Order{ID: 1, Type: order.OrderNormal})
	q.Push(&order.Order{ID: 2, Type: order.OrderVIP})
	q.Push(&order.Order{ID: 3, Type: order.OrderNormal})

	if got := q.Pop(); got.ID != 2 {
		t.Fatalf("want VIP(2), got %d", got.ID)
	}
	if got := q.Pop(); got.ID != 1 {
		t.Fatalf("want Normal(1), got %d", got.ID)
	}
	if got := q.Pop(); got.ID != 3 {
		t.Fatalf("want Normal(3), got %d", got.ID)
	}
}

func TestQueue_PushReturn(t *testing.T) {
	q := order.NewQueue()
	q.Push(&order.Order{ID: 1, Type: order.OrderNormal})
	q.Push(&order.Order{ID: 2, Type: order.OrderNormal})
	popped := q.Pop()
	q.PushReturn(popped)
	got := q.Pop()
	if got.ID != 1 {
		t.Fatalf("want returned order (1), got %d", got.ID)
	}
}

func TestQueue_PopEmpty(t *testing.T) {
	q := order.NewQueue()
	if got := q.Pop(); got != nil {
		t.Fatalf("want nil, got %v", got)
	}
}
