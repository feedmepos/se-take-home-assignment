package internal

import "testing"

func TestQueue_VIPBeforeNormal(t *testing.T) {
	q := &Queue{}
	q.Push(&Order{ID: 1, Type: Normal})
	q.Push(&Order{ID: 2, Type: VIP})
	q.Push(&Order{ID: 3, Type: Normal})

	assertOrder(t, q.Pop(), 2, VIP)
	assertOrder(t, q.Pop(), 1, Normal)
	assertOrder(t, q.Pop(), 3, Normal)

	if q.Pop() != nil {
		t.Error("expected nil on empty queue")
	}
}

func TestQueue_VIPFIFOOrder(t *testing.T) {
	q := &Queue{}
	q.Push(&Order{ID: 1, Type: VIP})
	q.Push(&Order{ID: 3, Type: VIP})
	q.Push(&Order{ID: 5, Type: VIP})

	assertOrder(t, q.Pop(), 1, VIP)
	assertOrder(t, q.Pop(), 3, VIP)
	assertOrder(t, q.Pop(), 5, VIP)
}

func TestQueue_PushByID_InsertsInOrder(t *testing.T) {
	q := &Queue{}
	q.Push(&Order{ID: 3, Type: VIP})
	q.Push(&Order{ID: 5, Type: VIP})

	// Re-insert a lower-ID order (simulating bot removal returning an order).
	q.PushByID(&Order{ID: 1, Type: VIP})

	assertOrder(t, q.Pop(), 1, VIP)
	assertOrder(t, q.Pop(), 3, VIP)
	assertOrder(t, q.Pop(), 5, VIP)
}

func TestQueue_PushByID_MixedGroups(t *testing.T) {
	q := &Queue{}
	q.Push(&Order{ID: 4, Type: VIP})
	q.Push(&Order{ID: 6, Type: Normal})

	q.PushByID(&Order{ID: 2, Type: Normal}) // re-insert before Normal#6

	// VIP always first
	assertOrder(t, q.Pop(), 4, VIP)
	assertOrder(t, q.Pop(), 2, Normal)
	assertOrder(t, q.Pop(), 6, Normal)
}

func TestQueue_Len(t *testing.T) {
	q := &Queue{}
	if q.Len() != 0 {
		t.Errorf("expected 0, got %d", q.Len())
	}
	q.Push(&Order{ID: 1, Type: Normal})
	q.Push(&Order{ID: 2, Type: VIP})
	if q.Len() != 2 {
		t.Errorf("expected 2, got %d", q.Len())
	}
	q.Pop()
	if q.Len() != 1 {
		t.Errorf("expected 1, got %d", q.Len())
	}
}

func assertOrder(t *testing.T, o *Order, id int, typ OrderType) {
	t.Helper()
	if o == nil {
		t.Fatalf("expected order #%d (%s), got nil", id, typ)
	}
	if o.ID != id || o.Type != typ {
		t.Errorf("expected Order{ID:%d, Type:%s}, got Order{ID:%d, Type:%s}", id, typ, o.ID, o.Type)
	}
}
