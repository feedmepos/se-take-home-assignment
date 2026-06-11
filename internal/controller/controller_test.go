package controller

import (
	"io"
	"testing"
	"time"
)

// newTestController uses a huge processing duration so bots stay in
// PROCESSING and never complete during a test — assignment, requeue and
// destruction logic can then be asserted deterministically, no sleeps.
func newTestController() *Controller {
	return New(time.Hour, io.Discard)
}

func (c *Controller) pendingIDs() []int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return ids(c.pending.Snapshot())
}

func (c *Controller) botOrder(i int) *Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.bots[i].order
}

func (c *Controller) botCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bots)
}

func TestOrderIDsUniqueAndIncreasing(t *testing.T) {
	c := newTestController()
	c.AddNormalOrder()
	c.AddVIPOrder()
	c.AddNormalOrder()
	c.AddVIPOrder()
	c.AddNormalOrder()

	// IDs 1..5 issued in arrival order; queue shows VIPs first.
	want := []int{2, 4, 1, 3, 5}
	if got := c.pendingIDs(); !equalInts(got, want) {
		t.Fatalf("pending = %v, want %v", got, want)
	}
}

func TestNewBotPicksVIPFirst(t *testing.T) {
	c := newTestController()
	c.AddNormalOrder() // #1
	c.AddVIPOrder()    // #2
	c.AddBot()

	o := c.botOrder(0)
	if o == nil || o.Type != VIP || o.ID != 2 {
		t.Fatalf("bot picked %v, want VIP Order #2", o)
	}
	if got := c.pendingIDs(); !equalInts(got, []int{1}) {
		t.Fatalf("pending = %v, want [1]", got)
	}
}

func TestRemoveBotWhileProcessingRequeuesWithPriority(t *testing.T) {
	c := newTestController()
	c.AddNormalOrder() // #1
	c.AddBot()         // picks up #1
	c.AddVIPOrder()    // #2 pending (bot busy)

	c.RemoveBot()

	if n := c.botCount(); n != 0 {
		t.Fatalf("bots = %d, want 0", n)
	}
	// Returned Normal #1 must sit behind pending VIP #2.
	if got := c.pendingIDs(); !equalInts(got, []int{2, 1}) {
		t.Fatalf("pending = %v, want [2 1]", got)
	}
}

func TestRemoveIdleBotLeavesOrdersUntouched(t *testing.T) {
	c := newTestController()
	c.AddBot()
	c.AddBot()
	c.AddNormalOrder() // picked up by bot 1 (first idle)

	c.RemoveBot() // newest bot (#2) is idle

	if n := c.botCount(); n != 1 {
		t.Fatalf("bots = %d, want 1", n)
	}
	if o := c.botOrder(0); o == nil || o.ID != 1 {
		t.Fatalf("bot #1 order = %v, want Order #1 still processing", o)
	}
	if got := c.pendingIDs(); len(got) != 0 {
		t.Fatalf("pending = %v, want empty", got)
	}
}

func TestRemoveBotHandsReturnedOrderToIdleBot(t *testing.T) {
	c := newTestController()
	c.AddBot()         // bot 1
	c.AddBot()         // bot 2
	c.AddNormalOrder() // #1 -> bot 1 (first idle)

	// Arrange "newest bot busy, older bot idle" (in real runs this state
	// arises when the older bot completes its order while the newer one
	// is mid-processing): swap so the busy bot sits in the newest slot.
	c.mu.Lock()
	c.bots[0], c.bots[1] = c.bots[1], c.bots[0]
	c.mu.Unlock()

	c.RemoveBot() // destroys the busy bot; #1 must not strand in pending

	if o := c.botOrder(0); o == nil || o.ID != 1 {
		t.Fatalf("idle bot picked %v, want returned Order #1", o)
	}
	if got := c.pendingIDs(); len(got) != 0 {
		t.Fatalf("pending = %v, want empty", got)
	}
}

func TestRemoveBotWithNoBotsIsNoop(t *testing.T) {
	c := newTestController()
	c.RemoveBot() // must not panic
	if n := c.botCount(); n != 0 {
		t.Fatalf("bots = %d, want 0", n)
	}
}

func TestBotIdleWhenNoPendingOrders(t *testing.T) {
	c := newTestController()
	c.AddBot()
	if o := c.botOrder(0); o != nil {
		t.Fatalf("bot order = %v, want nil (IDLE)", o)
	}
	if !c.Drained() {
		t.Fatal("Drained() = false, want true with no orders and idle bot")
	}
}

func TestOrderCompletesAndBotTakesNext(t *testing.T) {
	c := New(10*time.Millisecond, io.Discard)
	c.AddVIPOrder()    // #1
	c.AddNormalOrder() // #2
	c.AddBot()

	deadline := time.Now().Add(2 * time.Second)
	for !c.Drained() {
		if time.Now().After(deadline) {
			t.Fatal("orders did not complete in time")
		}
		time.Sleep(time.Millisecond)
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if got := ids(c.completed); !equalInts(got, []int{1, 2}) {
		t.Fatalf("completed = %v, want [1 2] (VIP first)", got)
	}
}
