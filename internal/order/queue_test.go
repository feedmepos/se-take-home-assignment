package order

import (
	"testing"
	"time"
)

func TestQueue_VIPServedBeforeNormal(t *testing.T) {
	q := NewQueue()
	now := time.Now()

	n1 := New(1, Normal, now)
	v1 := New(2, VIP, now)
	n2 := New(3, Normal, now)
	v2 := New(4, VIP, now)

	q.Push(n1)
	q.Push(v1)
	q.Push(n2)
	q.Push(v2)

	want := []int{2, 4, 1, 3}
	for i, id := range want {
		got := q.Pop()
		if got == nil || got.ID != id {
			t.Fatalf("pop %d: want id %d, got %+v", i, id, got)
		}
	}
	if q.Pop() != nil {
		t.Fatalf("expected empty queue")
	}
}

func TestQueue_PushFrontReturnsToHeadOfClass(t *testing.T) {
	q := NewQueue()
	now := time.Now()

	n1 := New(1, Normal, now)
	n2 := New(2, Normal, now)
	v1 := New(3, VIP, now)

	q.Push(n1)
	q.Push(n2)
	q.Push(v1)

	first := q.Pop()
	if first.ID != 3 {
		t.Fatalf("want VIP id 3 first, got %d", first.ID)
	}

	q.PushFront(first)

	again := q.Pop()
	if again.ID != 3 {
		t.Fatalf("PushFront should restore VIP to head of VIP class, got %d", again.ID)
	}

	q.PushFront(New(4, Normal, now))
	got := q.Pop()
	if got.ID != 4 {
		t.Fatalf("PushFront for Normal should place ahead of existing normals, got %d", got.ID)
	}
	if q.Pop().ID != 1 || q.Pop().ID != 2 {
		t.Fatalf("remaining normals in wrong order")
	}
}

func TestQueue_LenAndSnapshot(t *testing.T) {
	q := NewQueue()
	now := time.Now()
	q.Push(New(1, Normal, now))
	q.Push(New(2, VIP, now))

	if q.Len() != 2 {
		t.Fatalf("len: want 2, got %d", q.Len())
	}
	snap := q.Snapshot()
	if len(snap) != 2 || snap[0].ID != 2 || snap[1].ID != 1 {
		t.Fatalf("snapshot must be VIP then Normal, got %+v", snap)
	}
}
