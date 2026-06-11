package controller

import "testing"

func ids(orders []*Order) []int {
	out := make([]int, len(orders))
	for i, o := range orders {
		out[i] = o.ID
	}
	return out
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestMixedEnqueueKeepsVIPBeforeNormal(t *testing.T) {
	q := NewPriorityQueue()
	q.Enqueue(&Order{ID: 1, Type: Normal})
	q.Enqueue(&Order{ID: 2, Type: VIP})
	q.Enqueue(&Order{ID: 3, Type: Normal})
	q.Enqueue(&Order{ID: 4, Type: VIP})

	// VIPs first (FIFO among themselves), then Normals (FIFO).
	want := []int{2, 4, 1, 3}
	if got := ids(q.Snapshot()); !equalInts(got, want) {
		t.Fatalf("queue order = %v, want %v", got, want)
	}
}

func TestConsecutiveVIPsKeepFIFO(t *testing.T) {
	q := NewPriorityQueue()
	for i := 1; i <= 4; i++ {
		q.Enqueue(&Order{ID: i, Type: VIP})
	}
	for i := 1; i <= 4; i++ {
		if o := q.Dequeue(); o == nil || o.ID != i {
			t.Fatalf("dequeue %d = %v, want ID %d", i, o, i)
		}
	}
}

func TestDequeueEmptyReturnsNil(t *testing.T) {
	q := NewPriorityQueue()
	if o := q.Dequeue(); o != nil {
		t.Fatalf("dequeue on empty queue = %v, want nil", o)
	}
}

func TestLen(t *testing.T) {
	q := NewPriorityQueue()
	if q.Len() != 0 {
		t.Fatalf("empty queue Len = %d, want 0", q.Len())
	}
	q.Enqueue(&Order{ID: 1, Type: Normal})
	q.Enqueue(&Order{ID: 2, Type: VIP})
	if q.Len() != 2 {
		t.Fatalf("Len = %d, want 2", q.Len())
	}
	q.Dequeue()
	if q.Len() != 1 {
		t.Fatalf("Len after dequeue = %d, want 1", q.Len())
	}
}

func TestDequeueAfterMixedEnqueueDrainsInPriorityOrder(t *testing.T) {
	q := NewPriorityQueue()
	q.Enqueue(&Order{ID: 1, Type: Normal})
	q.Enqueue(&Order{ID: 2, Type: VIP})
	q.Enqueue(&Order{ID: 3, Type: VIP})
	q.Enqueue(&Order{ID: 4, Type: Normal})

	want := []int{2, 3, 1, 4}
	for _, id := range want {
		o := q.Dequeue()
		if o == nil || o.ID != id {
			t.Fatalf("dequeue = %v, want ID %d", o, id)
		}
	}
	if q.Len() != 0 {
		t.Fatalf("queue not drained, Len = %d", q.Len())
	}
}
