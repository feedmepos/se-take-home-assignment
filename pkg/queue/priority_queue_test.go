package queue

import "testing"

// ticket mimics an order: VIP items should be served before Normal items,
// and within the same kind, lower IDs (created earlier) go first.
type ticket struct {
	id  int
	vip bool
}

func ticketLess(a, b ticket) bool {
	if a.vip != b.vip {
		return a.vip // VIP first
	}
	return a.id < b.id // then lower ID first
}

func TestPriorityQueue_Ordering(t *testing.T) {
	pq := New(ticketLess)

	pq.Push(ticket{id: 1, vip: false})
	pq.Push(ticket{id: 2, vip: false})
	pq.Push(ticket{id: 3, vip: true})
	pq.Push(ticket{id: 4, vip: true})
	pq.Push(ticket{id: 5, vip: false})

	want := []ticket{
		{id: 3, vip: true},
		{id: 4, vip: true},
		{id: 1, vip: false},
		{id: 2, vip: false},
		{id: 5, vip: false},
	}

	for i, w := range want {
		got, ok := pq.Pop()
		if !ok {
			t.Fatalf("pop %d: expected ok=true", i)
		}
		if got != w {
			t.Fatalf("pop %d: got %+v, want %+v", i, got, w)
		}
	}
}

func TestPriorityQueue_PopEmpty(t *testing.T) {
	pq := New(ticketLess)
	_, ok := pq.Pop()
	if ok {
		t.Fatalf("expected ok=false when popping an empty queue")
	}
}

func TestPriorityQueue_PeekDoesNotMutate(t *testing.T) {
	pq := New(ticketLess)
	pq.Push(ticket{id: 1, vip: false})
	pq.Push(ticket{id: 2, vip: true})

	first, ok := pq.Peek()
	if !ok || first.id != 2 {
		t.Fatalf("peek: got %+v ok=%v, want id=2 ok=true", first, ok)
	}
	if pq.Len() != 2 {
		t.Fatalf("peek should not change Len(): got %d, want 2", pq.Len())
	}

	second, ok := pq.Peek()
	if !ok || second != first {
		t.Fatalf("peek should be idempotent: got %+v, want %+v", second, first)
	}
}

func TestPriorityQueue_ItemsSnapshotWithoutDraining(t *testing.T) {
	pq := New(ticketLess)
	pq.Push(ticket{id: 1, vip: false})
	pq.Push(ticket{id: 2, vip: true})
	pq.Push(ticket{id: 3, vip: false})

	items := pq.Items()
	want := []ticket{
		{id: 2, vip: true},
		{id: 1, vip: false},
		{id: 3, vip: false},
	}
	if len(items) != len(want) {
		t.Fatalf("Items() len = %d, want %d", len(items), len(want))
	}
	for i := range want {
		if items[i] != want[i] {
			t.Fatalf("Items()[%d] = %+v, want %+v", i, items[i], want[i])
		}
	}

	// The queue must be untouched: Len() and a subsequent Items() call
	// should be unaffected by the previous snapshot.
	if pq.Len() != 3 {
		t.Fatalf("Items() must not drain the queue: Len() = %d, want 3", pq.Len())
	}
	again := pq.Items()
	if len(again) != 3 {
		t.Fatalf("second Items() call len = %d, want 3", len(again))
	}
}
