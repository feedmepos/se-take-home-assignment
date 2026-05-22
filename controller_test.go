package main

import (
	"bytes"
	"testing"
	"time"
)

const testDuration = 50 * time.Millisecond

func newTestCtrl() *Controller {
	return NewController(testDuration, &bytes.Buffer{})
}

func wait(d time.Duration) { time.Sleep(d) }

// ── Order queue ───────────────────────────────────────────────────────────────

func TestOrderIDsAreUniqueAndIncreasing(t *testing.T) {
	c := newTestCtrl()
	ids := make([]int, 5)
	for i := range ids {
		ids[i] = c.NewOrder(Normal).ID
	}
	for i := 1; i < len(ids); i++ {
		if ids[i] <= ids[i-1] {
			t.Fatalf("order IDs not strictly increasing: %v", ids)
		}
	}
}

func TestNormalOrderAppendsToEnd(t *testing.T) {
	c := newTestCtrl()
	c.NewOrder(Normal) // #1
	c.NewOrder(Normal) // #2

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.pending) != 2 || c.pending[0].ID != 1 || c.pending[1].ID != 2 {
		t.Fatalf("unexpected pending: %v", c.pending)
	}
}

func TestVIPOrderIsInsertedBeforeNormals(t *testing.T) {
	c := newTestCtrl()
	c.NewOrder(Normal) // #1
	c.NewOrder(Normal) // #2
	c.NewOrder(VIP)    // #3 — must jump to position 0

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.pending[0].ID != 3 || c.pending[0].Type != VIP {
		t.Fatalf("VIP order should be first, got %v", c.pending)
	}
}

func TestVIPOrderIsQueuedBehindExistingVIPs(t *testing.T) {
	c := newTestCtrl()
	c.NewOrder(VIP)    // #1
	c.NewOrder(Normal) // #2
	c.NewOrder(VIP)    // #3 — must go after #1 but before #2

	c.mu.Lock()
	defer c.mu.Unlock()
	// Expected: [VIP#1, VIP#3, Normal#2]
	if c.pending[0].ID != 1 || c.pending[1].ID != 3 || c.pending[2].ID != 2 {
		t.Fatalf("wrong queue order: got IDs %d %d %d", c.pending[0].ID, c.pending[1].ID, c.pending[2].ID)
	}
}

// ── Bot processing ────────────────────────────────────────────────────────────

func TestBotProcessesOrder(t *testing.T) {
	c := newTestCtrl()
	c.NewOrder(Normal)
	c.AddBot()

	wait(testDuration * 3)

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.completed) != 1 {
		t.Fatalf("expected 1 completed order, got %d", len(c.completed))
	}
	if len(c.pending) != 0 {
		t.Fatalf("expected 0 pending orders, got %d", len(c.pending))
	}
}

func TestBotProcessesVIPBeforeNormal(t *testing.T) {
	c := newTestCtrl()
	c.NewOrder(Normal) // #1
	c.NewOrder(VIP)    // #2 — must be processed first
	c.AddBot()

	wait(testDuration * 3)

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.completed) == 0 || c.completed[0].ID != 2 {
		t.Fatalf("VIP order should be completed first")
	}
}

func TestIdleBotPicksUpNewOrder(t *testing.T) {
	c := newTestCtrl()
	c.AddBot() // no orders yet — bot is idle

	c.NewOrder(Normal) // #1 — idle bot should pick it up immediately

	wait(testDuration * 3)

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.completed) != 1 {
		t.Fatalf("expected 1 completed order, got %d", len(c.completed))
	}
}

func TestMultipleBotsProcessConcurrently(t *testing.T) {
	c := newTestCtrl()
	c.NewOrder(Normal) // #1
	c.NewOrder(Normal) // #2
	c.NewOrder(Normal) // #3
	c.AddBot()
	c.AddBot()
	c.AddBot()

	wait(testDuration * 3)

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.completed) != 3 {
		t.Fatalf("expected 3 completed orders, got %d", len(c.completed))
	}
}

// ── Bot removal ───────────────────────────────────────────────────────────────

func TestRemoveBotWhileProcessingReturnsOrderToPending(t *testing.T) {
	c := newTestCtrl()
	c.NewOrder(Normal) // #1
	c.AddBot()         // Bot #1 picks up #1

	c.RemoveBot() // cancel immediately; #1 must return to pending

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.pending) != 1 || c.pending[0].ID != 1 {
		t.Fatalf("order should be back in pending, got %v", c.pending)
	}
	if len(c.completed) != 0 {
		t.Fatalf("no order should be completed")
	}
}

func TestRemoveBotWhileIdleRemovesCleanly(t *testing.T) {
	c := newTestCtrl()
	c.AddBot()    // no orders — bot is idle
	c.RemoveBot() // should not panic or leave anything in pending

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.bots) != 0 {
		t.Fatalf("expected 0 bots, got %d", len(c.bots))
	}
	if len(c.pending) != 0 {
		t.Fatalf("expected 0 pending orders")
	}
}

func TestRemoveBotRemovesNewest(t *testing.T) {
	c := newTestCtrl()
	c.AddBot() // Bot #1
	c.AddBot() // Bot #2
	c.AddBot() // Bot #3

	c.RemoveBot() // should remove Bot #3

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.bots) != 2 || c.bots[len(c.bots)-1].ID != 2 {
		t.Fatalf("expected Bot #2 to be newest remaining bot")
	}
}

func TestReturnedVIPOrderKeepsPriority(t *testing.T) {
	c := newTestCtrl()
	c.NewOrder(VIP)    // #1
	c.NewOrder(Normal) // #2
	c.AddBot()         // picks up VIP#1

	// Add another Normal while VIP#1 is being processed
	c.NewOrder(Normal) // #3
	// Pending: [Normal#2, Normal#3]

	c.RemoveBot() // VIP#1 returned; must go at front (before all Normals)

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.pending[0].ID != 1 || c.pending[0].Type != VIP {
		t.Fatalf("returned VIP order should be first, got %v", c.pending)
	}
}
