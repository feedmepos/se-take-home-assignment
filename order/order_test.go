package order

import (
	"testing"
	"time"
)

func TestOrderQueueVIPPriority(t *testing.T) {
	que := NewQueue()

	normal1 := &Order{ID: 1, Type: Normal}
	vip1 := &Order{ID: 2, Type: VIP}
	normal2 := &Order{ID: 3, Type: Normal}
	vip2 := &Order{ID: 4, Type: VIP}

	que.AddOrder(normal1)
	que.AddOrder(vip1)
	que.AddOrder(normal2)
	que.AddOrder(vip2)

	expected := []int{2, 4, 1, 3}
	for i, order := range que.Pending {
		if order.ID != expected[i] {
			t.Errorf("Expected order ID %d at position %d, got %d", expected[i], i, order.ID)
		}
	}
}

func TestBotProcessing(t *testing.T) {
	que := NewQueue()
	bm := NewBotManager(que)

	order := &Order{ID: 1, Type: Normal, CreatedAt: time.Now()}
	que.AddOrder(order)

	bm.AddBot()
	time.Sleep(11 * time.Second) // Wait for processing

	if len(que.Completed) != 1 {
		t.Errorf("Expected 1 completed order, got %d", len(que.Completed))
	}
	if que.Completed[0].ID != 1 {
		t.Errorf("Expected completed order ID 1, got %d", que.Completed[0].ID)
	}
}
