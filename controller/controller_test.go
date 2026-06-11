package controller

import (
	"strings"
	"sync"
	"testing"
	"time"
)

func newTestController(t *testing.T) (*Controller, *capturedLog) {
	t.Helper()
	logs := &capturedLog{}
	c := New(Options{Tick: 50 * time.Millisecond, Logger: logs.append})
	return c, logs
}

type capturedLog struct {
	mu   sync.Mutex
	msgs []string
}

func (l *capturedLog) append(s string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.msgs = append(l.msgs, s)
}

func (l *capturedLog) joined() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return strings.Join(l.msgs, "\n")
}

func TestOrderIDsAreUniqueAndIncreasing(t *testing.T) {
	c, _ := newTestController(t)
	o1 := c.NewOrder(OrderNormal)
	o2 := c.NewOrder(OrderVIP)
	o3 := c.NewOrder(OrderNormal)
	if o1.ID != 1 || o2.ID != 2 || o3.ID != 3 {
		t.Fatalf("expected ids 1,2,3; got %d,%d,%d", o1.ID, o2.ID, o3.ID)
	}
}

func TestVIPGoesAheadOfNormalButBehindOtherVIP(t *testing.T) {
	c, _ := newTestController(t)
	c.NewOrder(OrderNormal) // #1
	c.NewOrder(OrderVIP)    // #2
	c.NewOrder(OrderNormal) // #3
	c.NewOrder(OrderVIP)    // #4

	snap := c.Status()
	want := []int{2, 4, 1, 3}
	if len(snap.Pending) != len(want) {
		t.Fatalf("queue size: got %d want %d", len(snap.Pending), len(want))
	}
	for i, id := range want {
		if snap.Pending[i].ID != id {
			t.Fatalf("queue[%d]: got #%d want #%d", i, snap.Pending[i].ID, id)
		}
	}
}

func TestBotProcessesOrderAndBecomesIdle(t *testing.T) {
	c, logs := newTestController(t)
	c.NewOrder(OrderNormal)
	c.AddBot()

	if !c.WaitIdle(2 * time.Second) {
		t.Fatalf("controller did not become idle\nlogs:\n%s", logs.joined())
	}
	snap := c.Status()
	if len(snap.Pending) != 0 {
		t.Fatalf("expected empty queue, got %d", len(snap.Pending))
	}
	if len(snap.Bots) != 1 || snap.Bots[0].Status != BotIdle {
		t.Fatalf("expected 1 idle bot, got %+v", snap.Bots)
	}
}

func TestBotPicksUpVIPFirst(t *testing.T) {
	c, logs := newTestController(t)
	c.NewOrder(OrderNormal) // #1
	c.NewOrder(OrderVIP)    // #2
	c.AddBot()

	if !c.WaitIdle(2 * time.Second) {
		t.Fatalf("not idle\nlogs:\n%s", logs.joined())
	}

	out := logs.joined()
	pickedVIP := strings.Index(out, "picked up VIP Order #2")
	pickedNormal := strings.Index(out, "picked up Normal Order #1")
	if pickedVIP == -1 || pickedNormal == -1 {
		t.Fatalf("expected both VIP and Normal pickups in log:\n%s", out)
	}
	if pickedVIP > pickedNormal {
		t.Fatalf("VIP should be picked up before Normal:\n%s", out)
	}
}

func TestRemovingBotMidProcessingRequeuesOrder(t *testing.T) {
	c, logs := newTestController(t)
	c.tick = 500 * time.Millisecond // longer tick so we can interrupt
	c.NewOrder(OrderVIP)            // #1
	c.AddBot()                      // Bot #1 picks up #1

	time.Sleep(100 * time.Millisecond) // let it start processing

	snapBefore := c.Status()
	if len(snapBefore.Bots) != 1 || snapBefore.Bots[0].Status != BotProcessing {
		t.Fatalf("expected bot processing, got %+v\nlogs:\n%s", snapBefore.Bots, logs.joined())
	}

	c.RemoveNewestBot()

	snapAfter := c.Status()
	if len(snapAfter.Bots) != 0 {
		t.Fatalf("expected 0 bots after remove, got %d", len(snapAfter.Bots))
	}
	if len(snapAfter.Pending) != 1 || snapAfter.Pending[0].ID != 1 {
		t.Fatalf("expected order #1 back in queue, got %+v", snapAfter.Pending)
	}
}

func TestRequeuedVIPGoesToFrontOfVIPs(t *testing.T) {
	c, _ := newTestController(t)
	c.tick = 500 * time.Millisecond
	c.NewOrder(OrderVIP) // #1
	c.AddBot()           // picks up #1

	time.Sleep(50 * time.Millisecond)

	c.NewOrder(OrderVIP) // #2 enqueued
	c.RemoveNewestBot()  // #1 requeues to front of VIPs

	snap := c.Status()
	if len(snap.Pending) != 2 {
		t.Fatalf("expected 2 pending, got %d", len(snap.Pending))
	}
	if snap.Pending[0].ID != 1 || snap.Pending[1].ID != 2 {
		t.Fatalf("expected [#1, #2], got [#%d, #%d]", snap.Pending[0].ID, snap.Pending[1].ID)
	}
}

func TestAddingBotImmediatelyProcessesPendingOrder(t *testing.T) {
	c, logs := newTestController(t)
	c.NewOrder(OrderNormal)
	c.NewOrder(OrderNormal)
	c.AddBot()

	if !c.WaitIdle(2 * time.Second) {
		t.Fatalf("not idle\nlogs:\n%s", logs.joined())
	}
}

func TestRemovingNonExistentBotIsNoOp(t *testing.T) {
	c, _ := newTestController(t)
	if c.RemoveNewestBot() != nil {
		t.Fatal("expected nil when no bots to remove")
	}
}

func TestCompletedOrdersAreTracked(t *testing.T) {
	c, logs := newTestController(t)
	c.NewOrder(OrderNormal) // #1
	c.NewOrder(OrderVIP)    // #2
	c.AddBot()

	if !c.WaitIdle(2 * time.Second) {
		t.Fatalf("not idle\nlogs:\n%s", logs.joined())
	}

	snap := c.Status()
	if len(snap.Completed) != 2 {
		t.Fatalf("expected 2 completed, got %d", len(snap.Completed))
	}
	if snap.Completed[0].ID != 2 || snap.Completed[1].ID != 1 {
		t.Fatalf("expected completion order [VIP#2, Normal#1], got [#%d, #%d]",
			snap.Completed[0].ID, snap.Completed[1].ID)
	}
}

func TestShutdownStopsAllBots(t *testing.T) {
	c, _ := newTestController(t)
	c.AddBot()
	c.AddBot()
	c.AddBot()
	c.Shutdown()
	if len(c.Status().Bots) != 0 {
		t.Fatal("expected 0 bots after shutdown")
	}
}
