package queue

import (
	"testing"

	"github.com/feedmepos/order-controller/internal/model"
)

func vip(id int) *model.Order  { return &model.Order{ID: id, IsVIP: true} }
func norm(id int) *model.Order { return &model.Order{ID: id, IsVIP: false} }

func ids(q *PendingQueue) []int {
	result := make([]int, len(q.items))
	for i, o := range q.items {
		result[i] = o.ID
	}
	return result
}

func TestAddNormal(t *testing.T) {
	var q PendingQueue
	q.AddNormal(norm(1))
	q.AddNormal(norm(3))
	q.AddNormal(norm(5))
	if got := ids(&q); !equal(got, []int{1, 3, 5}) {
		t.Fatalf("want [1 3 5], got %v", got)
	}
}

func TestVIPPrecedesNormal(t *testing.T) {
	var q PendingQueue
	q.AddNormal(norm(1))
	q.AddNormal(norm(3))
	q.AddVIP(vip(5))
	// VIP-5 inserted before Normal-1 and Normal-3
	if got := ids(&q); !equal(got, []int{5, 1, 3}) {
		t.Fatalf("want [5 1 3], got %v", got)
	}
}

func TestMultipleVIPOrdering(t *testing.T) {
	var q PendingQueue
	q.AddVIP(vip(2))
	q.AddNormal(norm(4))
	q.AddVIP(vip(6))
	// VIPs before Normals, VIPs in submission order
	if got := ids(&q); !equal(got, []int{2, 6, 4}) {
		t.Fatalf("want [2 6 4], got %v", got)
	}
}

func TestPop(t *testing.T) {
	var q PendingQueue
	q.AddVIP(vip(2))
	q.AddNormal(norm(1))
	q.AddNormal(norm(3))

	if o := q.Pop(); o.ID != 2 || !o.IsVIP {
		t.Fatalf("first pop should be VIP-2, got %+v", o)
	}
	if q.vipCount != 0 {
		t.Fatalf("vipCount should be 0 after popping last VIP")
	}
	if o := q.Pop(); o.ID != 1 {
		t.Fatalf("second pop should be Normal-1, got %+v", o)
	}
}

func TestRequeuVIP(t *testing.T) {
	var q PendingQueue
	// Simulate: VIP-3 was processing, new orders arrived
	q.AddVIP(vip(7))
	q.AddVIP(vip(9))
	q.AddNormal(norm(5))

	q.Requeue(vip(3)) // requeue earlier VIP
	// VIP-3 should be before VIP-7 and VIP-9
	if got := ids(&q); !equal(got, []int{3, 7, 9, 5}) {
		t.Fatalf("want [3 7 9 5], got %v", got)
	}
	if q.vipCount != 3 {
		t.Fatalf("vipCount should be 3, got %d", q.vipCount)
	}
}

func TestRequeueNormal(t *testing.T) {
	var q PendingQueue
	q.AddVIP(vip(8))
	q.AddNormal(norm(6))
	q.AddNormal(norm(10))

	q.Requeue(norm(4)) // requeue earlier Normal
	// Normal-4 should be before Normal-6 and Normal-10
	if got := ids(&q); !equal(got, []int{8, 4, 6, 10}) {
		t.Fatalf("want [8 4 6 10], got %v", got)
	}
}

// TestRequeueMultipleBots covers the case where two bots are removed LIFO
// and their orders must be requeued in correct ID order.
func TestRequeueMultipleBots(t *testing.T) {
	// Bot#1 holds VIP-3, Bot#2 holds VIP-6. Remove Bot#2 then Bot#1 (LIFO).
	var q PendingQueue
	q.AddVIP(vip(9))

	q.Requeue(vip(6)) // Bot#2 removed first
	q.Requeue(vip(3)) // Bot#1 removed second

	// Expected: [VIP-3, VIP-6, VIP-9]
	if got := ids(&q); !equal(got, []int{3, 6, 9}) {
		t.Fatalf("want [3 6 9], got %v", got)
	}
}

func equal(a, b []int) bool {
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

func TestPopEmpty(t *testing.T) {
	var q PendingQueue
	if o := q.Pop(); o != nil {
		t.Fatalf("Pop on empty queue should return nil, got %+v", o)
	}
}

func TestVIPCountAfterPop(t *testing.T) {
	var q PendingQueue
	q.AddVIP(vip(1))
	q.AddVIP(vip(3))
	q.AddNormal(norm(5))

	q.Pop() // VIP-1
	if q.vipCount != 1 {
		t.Fatalf("vipCount should be 1 after popping one VIP, got %d", q.vipCount)
	}
	q.Pop() // VIP-3
	if q.vipCount != 0 {
		t.Fatalf("vipCount should be 0 after all VIPs popped, got %d", q.vipCount)
	}
	if q.Len() != 1 {
		t.Fatalf("one Normal should remain, got len=%d", q.Len())
	}
}

func TestRequeueVIPIntoEmptyQueue(t *testing.T) {
	var q PendingQueue
	q.Requeue(vip(5))
	if got := ids(&q); !equal(got, []int{5}) {
		t.Fatalf("want [5], got %v", got)
	}
	if q.vipCount != 1 {
		t.Fatalf("vipCount should be 1, got %d", q.vipCount)
	}
}

func TestRequeueNormalIntoEmptyQueue(t *testing.T) {
	var q PendingQueue
	q.Requeue(norm(3))
	if got := ids(&q); !equal(got, []int{3}) {
		t.Fatalf("want [3], got %v", got)
	}
	if q.vipCount != 0 {
		t.Fatalf("vipCount should be 0, got %d", q.vipCount)
	}
}

// TestRequeueVIPAtEndOfVIPSection exercises the firstGreater path that returns hi,
// meaning the requeued VIP has the largest ID among all VIPs.
func TestRequeueVIPAtEndOfVIPSection(t *testing.T) {
	var q PendingQueue
	q.AddVIP(vip(2))
	q.AddVIP(vip(4))
	q.AddNormal(norm(6))
	q.Requeue(vip(8)) // goes after VIP-4, before Normal-6
	if got := ids(&q); !equal(got, []int{2, 4, 8, 6}) {
		t.Fatalf("want [2 4 8 6], got %v", got)
	}
	if q.vipCount != 3 {
		t.Fatalf("vipCount should be 3, got %d", q.vipCount)
	}
}

// TestRequeueNormalAtEndOfNormalSection exercises firstGreater returning hi for Normals.
func TestRequeueNormalAtEndOfNormalSection(t *testing.T) {
	var q PendingQueue
	q.AddVIP(vip(1))
	q.AddNormal(norm(3))
	q.AddNormal(norm(5))
	q.Requeue(norm(7)) // goes after Normal-5
	if got := ids(&q); !equal(got, []int{1, 3, 5, 7}) {
		t.Fatalf("want [1 3 5 7], got %v", got)
	}
}

// TestRequeueNormalWithOnlyVIPs checks that Requeue inserts the Normal after all
// VIPs when no Normal orders exist yet (lo == hi == len(items)).
func TestRequeueNormalWithOnlyVIPs(t *testing.T) {
	var q PendingQueue
	q.AddVIP(vip(2))
	q.AddVIP(vip(4))
	q.Requeue(norm(1))
	if got := ids(&q); !equal(got, []int{2, 4, 1}) {
		t.Fatalf("want [2 4 1], got %v", got)
	}
	if q.vipCount != 2 {
		t.Fatalf("vipCount should be 2, got %d", q.vipCount)
	}
}
