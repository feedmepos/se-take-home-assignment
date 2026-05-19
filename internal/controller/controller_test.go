package controller

import (
	"testing"
	"time"

	"mcd-order-controller/internal/order"
)

func newTestController(t *testing.T, procTime time.Duration) *Controller {
	t.Helper()
	return New(Config{ProcessTime: procTime})
}

// waitFor polls cond every 5ms up to d. It is needed because bot work runs in
// goroutines and we want to assert on observable states without sleeping for
// the full processing window.
func waitFor(t *testing.T, d time.Duration, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("condition not met within %s", d)
}

func TestVIPProcessedBeforeNormal(t *testing.T) {
	c := newTestController(t, 30*time.Millisecond)
	defer c.Shutdown()

	c.SubmitOrder(order.Normal)
	c.SubmitOrder(order.VIP)
	c.SubmitOrder(order.Normal)

	c.AddBot()

	waitFor(t, time.Second, func() bool {
		return len(c.Snapshot().Completed) == 3
	})

	completed := c.Snapshot().Completed
	if completed[0].Type != order.VIP {
		t.Fatalf("VIP must be completed first, got %v", completed[0].Type)
	}
}

func TestRemoveBotReturnsOrderToFront(t *testing.T) {
	c := newTestController(t, 200*time.Millisecond)
	defer c.Shutdown()

	c.SubmitOrder(order.Normal)
	c.SubmitOrder(order.VIP)

	c.AddBot()

	waitFor(t, time.Second, func() bool {
		for _, b := range c.Snapshot().Bots {
			if b.Status == BotProcessing && b.Current != nil && b.Current.Type == order.VIP {
				return true
			}
		}
		return false
	})

	if _, err := c.RemoveBot(); err != nil {
		t.Fatalf("remove bot: %v", err)
	}

	snap := c.Snapshot()
	if len(snap.Pending) != 2 {
		t.Fatalf("want 2 pending, got %d", len(snap.Pending))
	}
	if snap.Pending[0].Type != order.VIP {
		t.Fatalf("VIP order must return to front of its class, got %v", snap.Pending[0].Type)
	}
	if len(snap.Bots) != 0 {
		t.Fatalf("expected no bots remaining, got %d", len(snap.Bots))
	}
	if len(snap.Completed) != 0 {
		t.Fatalf("no orders should have completed, got %d", len(snap.Completed))
	}
}

func TestAddBotImmediatelyPicksUpPending(t *testing.T) {
	c := newTestController(t, 50*time.Millisecond)
	defer c.Shutdown()

	c.SubmitOrder(order.Normal)
	c.AddBot()

	waitFor(t, time.Second, func() bool {
		return len(c.Snapshot().Completed) == 1
	})
}

func TestNewestBotIsRemovedFirst(t *testing.T) {
	c := newTestController(t, 10*time.Millisecond)
	defer c.Shutdown()

	c.AddBot()
	c.AddBot()
	c.AddBot()

	b, err := c.RemoveBot()
	if err != nil {
		t.Fatalf("remove bot: %v", err)
	}
	if b.ID != 3 {
		t.Fatalf("want newest (id 3) removed, got %d", b.ID)
	}
}

func TestRemoveBotWhenNoneReturnsError(t *testing.T) {
	c := newTestController(t, 10*time.Millisecond)
	defer c.Shutdown()
	if _, err := c.RemoveBot(); err == nil {
		t.Fatalf("expected error when removing from empty bot pool")
	}
}

func TestOrderIDsIncreaseAndAreUnique(t *testing.T) {
	c := newTestController(t, 10*time.Millisecond)
	defer c.Shutdown()
	seen := map[int]bool{}
	last := 0
	for i := 0; i < 25; i++ {
		o := c.SubmitOrder(order.Normal)
		if seen[o.ID] {
			t.Fatalf("duplicate order id %d", o.ID)
		}
		seen[o.ID] = true
		if o.ID <= last {
			t.Fatalf("order id not strictly increasing: %d <= %d", o.ID, last)
		}
		last = o.ID
	}
}

func TestVIPInsertedBehindExistingVIPAheadOfNormal(t *testing.T) {
	c := newTestController(t, 10*time.Millisecond)
	defer c.Shutdown()

	n := c.SubmitOrder(order.Normal)
	v1 := c.SubmitOrder(order.VIP)
	v2 := c.SubmitOrder(order.VIP)

	snap := c.Snapshot()
	if len(snap.Pending) != 3 {
		t.Fatalf("want 3 pending, got %d", len(snap.Pending))
	}
	if snap.Pending[0].ID != v1.ID {
		t.Fatalf("first pending should be earlier VIP %d, got %d", v1.ID, snap.Pending[0].ID)
	}
	if snap.Pending[1].ID != v2.ID {
		t.Fatalf("second pending should be later VIP %d, got %d", v2.ID, snap.Pending[1].ID)
	}
	if snap.Pending[2].ID != n.ID {
		t.Fatalf("third pending should be the normal order %d, got %d", n.ID, snap.Pending[2].ID)
	}
}

func TestIdleBotWakesOnNewOrder(t *testing.T) {
	c := newTestController(t, 30*time.Millisecond)
	defer c.Shutdown()

	c.AddBot()

	waitFor(t, time.Second, func() bool {
		for _, b := range c.Snapshot().Bots {
			if b.Status == BotIdle {
				return true
			}
		}
		return false
	})

	c.SubmitOrder(order.VIP)

	waitFor(t, time.Second, func() bool {
		return len(c.Snapshot().Completed) == 1
	})
}
