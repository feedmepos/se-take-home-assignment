package queue

import (
	"testing"

	"github.com/se-take-home-assignment/internal/model"
)

func TestEnqueueNormalOrders(t *testing.T) {
	q := New()
	q.Enqueue(&model.Order{ID: 1, Type: model.Normal})
	q.Enqueue(&model.Order{ID: 2, Type: model.Normal})
	q.Enqueue(&model.Order{ID: 3, Type: model.Normal})

	if q.Len() != 3 {
		t.Fatalf("expected 3 orders, got %d", q.Len())
	}

	// Should dequeue in FIFO order
	o := q.Dequeue()
	if o.ID != 1 {
		t.Errorf("expected order #1, got #%d", o.ID)
	}
	o = q.Dequeue()
	if o.ID != 2 {
		t.Errorf("expected order #2, got #%d", o.ID)
	}
	o = q.Dequeue()
	if o.ID != 3 {
		t.Errorf("expected order #3, got #%d", o.ID)
	}
}

func TestEnqueueVIPPriority(t *testing.T) {
	q := New()
	q.Enqueue(&model.Order{ID: 1, Type: model.Normal})
	q.Enqueue(&model.Order{ID: 2, Type: model.Normal})
	q.Enqueue(&model.Order{ID: 3, Type: model.VIP}) // Should be dequeued first
	q.Enqueue(&model.Order{ID: 4, Type: model.Normal})
	q.Enqueue(&model.Order{ID: 5, Type: model.VIP}) // Should be dequeued second

	// Expected dequeue order: #3(VIP), #5(VIP), #1(Normal), #2(Normal), #4(Normal)
	expected := []int64{3, 5, 1, 2, 4}
	for i, expectedID := range expected {
		o := q.Dequeue()
		if o == nil {
			t.Fatalf("order %d: expected order #%d, got nil", i, expectedID)
		}
		if o.ID != expectedID {
			t.Errorf("order %d: expected #%d, got #%d", i, expectedID, o.ID)
		}
	}
}

func TestDequeueEmpty(t *testing.T) {
	q := New()
	o := q.Dequeue()
	if o != nil {
		t.Errorf("expected nil from empty queue, got %v", o)
	}
}

func TestInsertByPriorityVIP(t *testing.T) {
	q := New()
	q.Enqueue(&model.Order{ID: 2, Type: model.VIP})
	q.Enqueue(&model.Order{ID: 4, Type: model.VIP})
	q.Enqueue(&model.Order{ID: 1, Type: model.Normal})
	q.Enqueue(&model.Order{ID: 3, Type: model.Normal})

	// Insert VIP #3 back - should go between #2 and #4
	q.InsertByPriority(&model.Order{ID: 3, Type: model.VIP})

	// Expected: VIP[#2, #3, #4] + Normal[#1, #3]
	orders := q.Orders()
	expectedIDs := []int64{2, 3, 4, 1, 3}
	if len(orders) != len(expectedIDs) {
		t.Fatalf("expected %d orders, got %d", len(expectedIDs), len(orders))
	}
	for i, expectedID := range expectedIDs {
		if orders[i].ID != expectedID {
			t.Errorf("position %d: expected #%d, got #%d", i, expectedID, orders[i].ID)
		}
	}
}

func TestInsertByPriorityNormal(t *testing.T) {
	q := New()
	q.Enqueue(&model.Order{ID: 1, Type: model.VIP})
	q.Enqueue(&model.Order{ID: 3, Type: model.Normal})
	q.Enqueue(&model.Order{ID: 5, Type: model.Normal})

	// Insert Normal #2 back - should go before #3 and #5
	q.InsertByPriority(&model.Order{ID: 2, Type: model.Normal})

	orders := q.Orders()
	expectedIDs := []int64{1, 2, 3, 5}
	if len(orders) != len(expectedIDs) {
		t.Fatalf("expected %d orders, got %d", len(expectedIDs), len(orders))
	}
	for i, expectedID := range expectedIDs {
		if orders[i].ID != expectedID {
			t.Errorf("position %d: expected #%d, got #%d", i, expectedID, orders[i].ID)
		}
	}
}

func TestInsertByPriorityEmptyQueue(t *testing.T) {
	q := New()
	q.InsertByPriority(&model.Order{ID: 1, Type: model.Normal})

	if q.Len() != 1 {
		t.Fatalf("expected 1 order, got %d", q.Len())
	}
	o := q.Dequeue()
	if o.ID != 1 {
		t.Errorf("expected order #1, got #%d", o.ID)
	}
}

func TestOrdersReturnsSnapshot(t *testing.T) {
	q := New()
	q.Enqueue(&model.Order{ID: 1, Type: model.VIP})
	q.Enqueue(&model.Order{ID: 2, Type: model.Normal})

	orders := q.Orders()
	if len(orders) != 2 {
		t.Fatalf("expected 2 orders, got %d", len(orders))
	}
	if orders[0].ID != 1 || orders[1].ID != 2 {
		t.Errorf("expected [#1, #2], got [#%d, #%d]", orders[0].ID, orders[1].ID)
	}

	// Mutating the snapshot should not affect the queue
	orders[0] = nil
	if q.Len() != 2 {
		t.Error("modifying snapshot affected the queue")
	}
}
