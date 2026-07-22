package internal

import (
	"bytes"
	"testing"
	"time"
)

func newTestController() *Controller {
	c := NewController(&bytes.Buffer{})
	c.processingTime = 30 * time.Millisecond
	return c
}

func waitFor(t *testing.T, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("condition not met within timeout")
}

func TestAddNormalOrder(t *testing.T) {
	c := newTestController()
	o := c.AddOrder(OrderNormal)
	if o.ID != 1 {
		t.Errorf("expected ID 1, got %d", o.ID)
	}
	if got := len(c.Snapshot().Pending); got != 1 {
		t.Errorf("expected 1 pending order, got %d", got)
	}
}

func TestOrderIDIsUniqueAndIncreasing(t *testing.T) {
	c := newTestController()
	a := c.AddOrder(OrderNormal)
	b := c.AddOrder(OrderVIP)
	d := c.AddOrder(OrderNormal)
	if a.ID != 1 || b.ID != 2 || d.ID != 3 {
		t.Errorf("expected 1,2,3 got %d,%d,%d", a.ID, b.ID, d.ID)
	}
}

func TestVIPOrderGoesBeforeNormal(t *testing.T) {
	c := newTestController()
	c.AddOrder(OrderNormal) // #1
	c.AddOrder(OrderNormal) // #2
	c.AddOrder(OrderVIP)    // #3 → should jump to front

	pending := c.Snapshot().Pending
	if pending[0].ID != 3 {
		t.Errorf("VIP should be first, got order #%d", pending[0].ID)
	}
}

func TestVIPOrderGoesBehindOtherVIPs(t *testing.T) {
	c := newTestController()
	c.AddOrder(OrderVIP)    // #1 VIP
	c.AddOrder(OrderNormal) // #2 Normal
	c.AddOrder(OrderVIP)    // #3 VIP → behind #1, before #2

	pending := c.Snapshot().Pending
	want := []int{1, 3, 2}
	for i, id := range want {
		if pending[i].ID != id {
			t.Errorf("position %d: expected #%d, got #%d", i, id, pending[i].ID)
		}
	}
}

func TestBotPicksUpOrderImmediately(t *testing.T) {
	c := newTestController()
	c.AddOrder(OrderNormal)
	c.AddBot()

	snap := c.Snapshot()
	if len(snap.Pending) != 0 {
		t.Errorf("order should be picked up immediately, got %d pending", len(snap.Pending))
	}
	if len(snap.Bots) != 1 || snap.Bots[0].Status != "PROCESSING" {
		t.Errorf("bot should be processing, got %+v", snap.Bots)
	}
}

func TestBotCompletesOrderAfterProcessingTime(t *testing.T) {
	c := newTestController()
	c.AddOrder(OrderNormal)
	c.AddBot()

	waitFor(t, func() bool {
		return len(c.Snapshot().Complete) == 1
	})

	snap := c.Snapshot()
	if snap.Bots[0].Status != "IDLE" {
		t.Errorf("bot should be IDLE after completing order, got %s", snap.Bots[0].Status)
	}
}

func TestBotContinuesToNextOrder(t *testing.T) {
	c := newTestController()
	c.AddBot()
	c.AddOrder(OrderNormal)
	c.AddOrder(OrderNormal)
	c.AddOrder(OrderNormal)

	waitFor(t, func() bool {
		return len(c.Snapshot().Complete) == 3
	})
}

func TestAddBotProcessesPendingImmediately(t *testing.T) {
	c := newTestController()
	c.AddOrder(OrderVIP)
	c.AddOrder(OrderNormal)

	if got := len(c.Snapshot().Pending); got != 2 {
		t.Fatalf("expected 2 pending, got %d", got)
	}

	c.AddBot()
	c.AddBot()

	snap := c.Snapshot()
	if len(snap.Pending) != 0 {
		t.Errorf("expected 0 pending after 2 bots added, got %d", len(snap.Pending))
	}
	for _, b := range snap.Bots {
		if b.Status != "PROCESSING" {
			t.Errorf("bot #%d should be processing, got %s", b.ID, b.Status)
		}
	}
}

func TestRemoveIdleBot(t *testing.T) {
	c := newTestController()
	c.AddBot()
	c.RemoveBot()

	if got := len(c.Snapshot().Bots); got != 0 {
		t.Errorf("expected 0 bots, got %d", got)
	}
}

func TestRemoveBusyBotReturnsOrder(t *testing.T) {
	c := newTestController()
	c.AddOrder(OrderVIP)
	c.AddBot()

	if len(c.Snapshot().Pending) != 0 {
		t.Fatal("bot should have picked up the order")
	}

	c.RemoveBot()

	snap := c.Snapshot()
	if len(snap.Pending) != 1 {
		t.Errorf("expected order to return, got %d pending", len(snap.Pending))
	}
	if len(snap.Bots) != 0 {
		t.Errorf("expected no bots, got %d", len(snap.Bots))
	}

	// Confirm the timer was cancelled — give it time to NOT complete.
	time.Sleep(80 * time.Millisecond)
	if got := len(c.Snapshot().Complete); got != 0 {
		t.Errorf("removed bot should not have completed an order, got %d complete", got)
	}
}

func TestRemoveBotReturnsOrderToOriginalPosition(t *testing.T) {
	c := newTestController()
	c.AddOrder(OrderNormal) // #1
	c.AddOrder(OrderNormal) // #2
	c.AddOrder(OrderNormal) // #3

	c.AddBot() // takes #1
	if c.Snapshot().Pending[0].ID != 2 {
		t.Fatalf("expected #2 first after bot takes #1")
	}

	c.AddOrder(OrderNormal) // #4 → end

	c.RemoveBot() // #1 should slot back at front

	want := []int{1, 2, 3, 4}
	pending := c.Snapshot().Pending
	for i, id := range want {
		if pending[i].ID != id {
			t.Errorf("position %d: expected #%d, got #%d", i, id, pending[i].ID)
		}
	}
}

func TestRemoveBotWhenNoBots(t *testing.T) {
	c := newTestController()
	got := c.RemoveBot()
	if got != nil {
		t.Errorf("expected nil when no bots, got %+v", got)
	}
}

func TestNewestBotIsRemoved(t *testing.T) {
	c := newTestController()
	c.AddBot() // #1
	c.AddBot() // #2
	c.AddBot() // #3

	removed := c.RemoveBot()
	if removed.ID != 3 {
		t.Errorf("expected to remove newest bot #3, got #%d", removed.ID)
	}
}

func TestVIPProcessedBeforeNormal(t *testing.T) {
	c := newTestController()
	c.AddOrder(OrderNormal) // #1
	c.AddOrder(OrderVIP)    // #2 → front
	c.AddBot()

	snap := c.Snapshot()
	if snap.Bots[0].Order == nil || snap.Bots[0].Order.ID != 2 {
		t.Errorf("bot should process VIP order #2 first, got %+v", snap.Bots[0].Order)
	}
}

func TestInsertWithPriorityEmpty(t *testing.T) {
	got := insertWithPriority(nil, &Order{ID: 1, Type: OrderVIP})
	if len(got) != 1 || got[0].ID != 1 {
		t.Errorf("expected single item, got %+v", got)
	}
}
