package queue

import (
	"testing"

	"github.com/feedme/se-take-home-assignment/internal/model"
)

func makeNormal(id int) *model.Order {
	return &model.Order{ID: id, Type: model.OrderNormal}
}

func makeVIP(id int) *model.Order {
	return &model.Order{ID: id, Type: model.OrderVIP}
}

// --- 1.1 空队列 ---

func TestNewQueueIsEmpty(t *testing.T) {
	q := NewQueue()
	if !q.IsEmpty() {
		t.Error("new queue should be empty")
	}
}

func TestNewQueueLenZero(t *testing.T) {
	q := NewQueue()
	if q.Len() != 0 {
		t.Errorf("new queue Len() = %d, want 0", q.Len())
	}
}

func TestEmptyQueueDequeueNil(t *testing.T) {
	q := NewQueue()
	if o := q.Dequeue(); o != nil {
		t.Errorf("Dequeue on empty queue = %v, want nil", o)
	}
}

// --- 1.2 单类型入队出队 ---

func TestEnqueueNormalThenDequeue(t *testing.T) {
	q := NewQueue()
	o := makeNormal(1)
	q.Enqueue(o)
	got := q.Dequeue()
	if got == nil || got.Type != model.OrderNormal {
		t.Errorf("Dequeue after Normal Enqueue = %v, want Normal", got)
	}
}

func TestEnqueueVIPThenDequeue(t *testing.T) {
	q := NewQueue()
	o := makeVIP(1)
	q.Enqueue(o)
	got := q.Dequeue()
	if got == nil || got.Type != model.OrderVIP {
		t.Errorf("Dequeue after VIP Enqueue = %v, want VIP", got)
	}
}

func TestEnqueueMakesNotEmpty(t *testing.T) {
	q := NewQueue()
	q.Enqueue(makeNormal(1))
	if q.IsEmpty() {
		t.Error("queue should not be empty after Enqueue")
	}
}

func TestEnqueueLen(t *testing.T) {
	q := NewQueue()
	q.Enqueue(makeNormal(1))
	q.Enqueue(makeVIP(2))
	if q.Len() != 2 {
		t.Errorf("Len() = %d, want 2", q.Len())
	}
}

// --- 1.3 VIP 优先 ---

func TestVIPBeforeNormal(t *testing.T) {
	q := NewQueue()
	q.Enqueue(makeNormal(1))
	q.Enqueue(makeVIP(2))

	first := q.Dequeue()
	if first == nil || first.Type != model.OrderVIP || first.ID != 2 {
		t.Errorf("first Dequeue = %v, want VIP#2", first)
	}
	second := q.Dequeue()
	if second == nil || second.Type != model.OrderNormal || second.ID != 1 {
		t.Errorf("second Dequeue = %v, want Normal#1", second)
	}
}

func TestMultipleVIPsKeepNormalBehind(t *testing.T) {
	q := NewQueue()
	q.Enqueue(makeVIP(1))
	q.Enqueue(makeNormal(2))
	q.Enqueue(makeVIP(3))

	first := q.Dequeue()
	if first == nil || first.ID != 1 {
		t.Errorf("first = %v, want VIP#1", first)
	}
	second := q.Dequeue()
	if second == nil || second.ID != 3 {
		t.Errorf("second = %v, want VIP#3", second)
	}
	third := q.Dequeue()
	if third == nil || third.ID != 2 {
		t.Errorf("third = %v, want Normal#2", third)
	}
}

// --- 1.4 同优先级 FIFO ---

func TestVIPFIFO(t *testing.T) {
	q := NewQueue()
	q.Enqueue(makeVIP(1))
	q.Enqueue(makeVIP(2))

	if o := q.Dequeue(); o == nil || o.ID != 1 {
		t.Errorf("want VIP#1, got %v", o)
	}
	if o := q.Dequeue(); o == nil || o.ID != 2 {
		t.Errorf("want VIP#2, got %v", o)
	}
}

func TestNormalFIFO(t *testing.T) {
	q := NewQueue()
	q.Enqueue(makeNormal(1))
	q.Enqueue(makeNormal(2))

	if o := q.Dequeue(); o == nil || o.ID != 1 {
		t.Errorf("want Normal#1, got %v", o)
	}
	if o := q.Dequeue(); o == nil || o.ID != 2 {
		t.Errorf("want Normal#2, got %v", o)
	}
}

// --- 1.5 RollbackToFront ---

func TestRollbackVIPToFront(t *testing.T) {
	q := NewQueue()
	vip2 := makeVIP(2)
	q.Enqueue(vip2)

	// dequeue then rollback
	_ = q.Dequeue()
	q.RollbackToFront(vip2)

	// add another VIP behind
	q.Enqueue(makeVIP(3))

	// should get VIP#2 first (rolled back to front), then VIP#3
	first := q.Dequeue()
	if first == nil || first.ID != 2 {
		t.Errorf("after rollback, first = %v, want VIP#2", first)
	}
	second := q.Dequeue()
	if second == nil || second.ID != 3 {
		t.Errorf("after rollback, second = %v, want VIP#3", second)
	}
}

func TestRollbackNormalToFront(t *testing.T) {
	q := NewQueue()
	n1 := makeNormal(1)
	q.Enqueue(n1)

	_ = q.Dequeue()
	q.RollbackToFront(n1)
	q.Enqueue(makeNormal(2))

	first := q.Dequeue()
	if first == nil || first.ID != 1 {
		t.Errorf("after rollback, first = %v, want Normal#1", first)
	}
	second := q.Dequeue()
	if second == nil || second.ID != 2 {
		t.Errorf("after rollback, second = %v, want Normal#2", second)
	}
}

func TestRollbackVIPDoesNotAffectNormal(t *testing.T) {
	q := NewQueue()
	v1 := makeVIP(1)
	n1 := makeNormal(1)
	q.Enqueue(v1)
	q.Enqueue(n1)

	_ = q.Dequeue() // take v1
	q.RollbackToFront(v1)

	// v1 should still be before n1
	first := q.Dequeue()
	if first == nil || first.ID != 1 || first.Type != model.OrderVIP {
		t.Errorf("after rollback, first = %v, want VIP#1", first)
	}
	second := q.Dequeue()
	if second == nil || second.ID != 1 || second.Type != model.OrderNormal {
		t.Errorf("after rollback, second = %v, want Normal#1", second)
	}
}
