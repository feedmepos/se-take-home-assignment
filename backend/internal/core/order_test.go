package core

import "testing"

func TestNewOrder(t *testing.T) {
	q := NewOrderQueue()
	o := q.Add(Normal)
	if o.ID != 1 {
		t.Errorf("expected ID 1, got %d", o.ID)
	}
	if o.Type != Normal {
		t.Errorf("expected Normal, got %v", o.Type)
	}
	if o.Status != Pending {
		t.Errorf("expected Pending, got %v", o.Status)
	}
}

func TestVIPPriority(t *testing.T) {
	q := NewOrderQueue()
	q.Add(Normal) // #1
	q.Add(Normal) // #2
	q.Add(VIP)    // #3 — should be first in queue
	q.Add(Normal) // #4
	q.Add(VIP)    // #5 — should be after #3 but before normals

	o := q.Dequeue()
	if o.ID != 3 {
		t.Errorf("expected VIP #3 first, got #%d", o.ID)
	}
	o = q.Dequeue()
	if o.ID != 5 {
		t.Errorf("expected VIP #5 second, got #%d", o.ID)
	}
	o = q.Dequeue()
	if o.ID != 1 {
		t.Errorf("expected Normal #1 third, got #%d", o.ID)
	}
}

func TestDequeueEmpty(t *testing.T) {
	q := NewOrderQueue()
	o := q.Dequeue()
	if o != nil {
		t.Error("expected nil from empty queue")
	}
}

func TestReturnToQueue(t *testing.T) {
	q := NewOrderQueue()
	q.Add(Normal) // #1
	o := q.Dequeue()
	q.Return(o)
	got := q.Dequeue()
	if got.ID != 1 {
		t.Errorf("expected returned order #1, got #%d", got.ID)
	}
}
