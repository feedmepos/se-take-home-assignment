package controller

import (
	"testing"
	"time"
)

func TestVIPPriority(t *testing.T) {
	ctrl := New(200*time.Millisecond, nil)
	ctrl.AddOrder(OrderTypeNormal) // 1
	ctrl.AddOrder(OrderTypeNormal) // 2
	ctrl.AddOrder(OrderTypeVIP)    // 3
	ctrl.AddOrder(OrderTypeVIP)    // 4

	s := ctrl.Snapshot()
	assertOrderIDs(t, s.Pending, []int{3, 4, 1, 2})
}

func TestOrderIDIsUniqueAndIncreasing(t *testing.T) {
	ctrl := New(200*time.Millisecond, nil)

	one := ctrl.AddOrder(OrderTypeNormal)
	two := ctrl.AddOrder(OrderTypeVIP)
	three := ctrl.AddOrder(OrderTypeNormal)

	if one.ID != 1 || two.ID != 2 || three.ID != 3 {
		t.Fatalf("unexpected order IDs: got [%d %d %d], want [1 2 3]", one.ID, two.ID, three.ID)
	}
}

func TestBotProcessesOrder(t *testing.T) {
	ctrl := New(30*time.Millisecond, nil)
	ctrl.AddBot()
	ctrl.AddOrder(OrderTypeNormal)

	ok := ctrl.WaitForIdle(1 * time.Second)
	if !ok {
		t.Fatal("controller did not become idle in time")
	}

	s := ctrl.Snapshot()
	if len(s.Pending) != 0 {
		t.Fatalf("expected no pending orders, got %d", len(s.Pending))
	}
	assertOrderIDs(t, s.Complete, []int{1})
}

func TestRemoveProcessingBotReturnsOrderToQueue(t *testing.T) {
	ctrl := New(500*time.Millisecond, nil)
	ctrl.AddOrder(OrderTypeNormal) // 1
	ctrl.AddOrder(OrderTypeVIP)    // 2

	ctrl.AddBot() // bot 1 should pick VIP(2)
	time.Sleep(20 * time.Millisecond)
	ctrl.RemoveNewestBot()

	s := ctrl.Snapshot()
	assertOrderIDs(t, s.Pending, []int{2, 1})
	if len(s.Bots) != 0 {
		t.Fatalf("expected 0 bots, got %d", len(s.Bots))
	}
}

func assertOrderIDs(t *testing.T, orders []Order, want []int) {
	t.Helper()
	if len(orders) != len(want) {
		t.Fatalf("order len mismatch: got %d want %d", len(orders), len(want))
	}

	for i := range orders {
		if orders[i].ID != want[i] {
			t.Fatalf("order mismatch at %d: got %d want %d", i, orders[i].ID, want[i])
		}
	}
}
