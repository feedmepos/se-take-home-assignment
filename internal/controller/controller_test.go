package controller

import (
	"testing"
	"time"
)

func testTime() time.Time {
	return time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC)
}

func pendingIDs(snapshot Snapshot) []int {
	ids := make([]int, 0, len(snapshot.Pending))
	for _, order := range snapshot.Pending {
		ids = append(ids, order.ID)
	}
	return ids
}

func completedIDs(snapshot Snapshot) []int {
	ids := make([]int, 0, len(snapshot.Completed))
	for _, order := range snapshot.Completed {
		ids = append(ids, order.ID)
	}
	return ids
}

func assertIDs(t *testing.T, got []int, want []int) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("got IDs %v, want %v", got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("got IDs %v, want %v", got, want)
		}
	}
}

func TestOrderNumberGeneration(t *testing.T) {
	now := testTime()
	c := New()

	first := c.CreateOrder(NormalOrder, now)
	second := c.CreateOrder(VIPOrder, now.Add(time.Second))

	if first.ID != 1 || second.ID != 2 {
		t.Fatalf("got order IDs %d and %d, want 1 and 2", first.ID, second.ID)
	}
	assertIDs(t, pendingIDs(c.Snapshot(now)), []int{2, 1})
}

func TestVIPPriorityAndFIFO(t *testing.T) {
	now := testTime()
	c := New()

	c.CreateOrder(NormalOrder, now)
	c.CreateOrder(NormalOrder, now.Add(time.Second))
	c.CreateOrder(VIPOrder, now.Add(2*time.Second))
	c.CreateOrder(VIPOrder, now.Add(3*time.Second))
	c.CreateOrder(NormalOrder, now.Add(4*time.Second))

	assertIDs(t, pendingIDs(c.Snapshot(now)), []int{3, 4, 1, 2, 5})
}

func TestAddBotAssignsPendingWork(t *testing.T) {
	now := testTime()
	c := New()
	c.CreateOrder(NormalOrder, now)

	c.AddBot(now.Add(time.Second))
	snapshot := c.Snapshot(now.Add(time.Second))

	if len(snapshot.Pending) != 0 {
		t.Fatalf("got %d pending orders, want 0", len(snapshot.Pending))
	}
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].Status != BotProcessingStatus || snapshot.Bots[0].CurrentOrderID != 1 {
		t.Fatalf("bot did not pick up order: %+v", snapshot.Bots)
	}
}

func TestOrdersRemainPendingWithoutBots(t *testing.T) {
	now := testTime()
	c := New()
	c.CreateOrder(NormalOrder, now)
	c.CreateOrder(VIPOrder, now.Add(time.Second))

	c.Tick(now.Add(30 * time.Second))
	snapshot := c.Snapshot(now.Add(30 * time.Second))

	assertIDs(t, pendingIDs(snapshot), []int{2, 1})
	if len(snapshot.Bots) != 0 || len(snapshot.Completed) != 0 {
		t.Fatalf("got bots=%+v completed=%+v, want pending-only orders without bots", snapshot.Bots, snapshot.Completed)
	}
}

func TestIdleBotWaitsAndPicksUpNewOrder(t *testing.T) {
	now := testTime()
	c := New()

	c.AddBot(now)
	if snapshot := c.Snapshot(now); snapshot.Bots[0].Status != IdleStatus {
		t.Fatalf("got bot status %s, want IDLE", snapshot.Bots[0].Status)
	}

	c.CreateOrder(VIPOrder, now.Add(time.Second))
	snapshot := c.Snapshot(now.Add(time.Second))
	if snapshot.Bots[0].Status != BotProcessingStatus || snapshot.Bots[0].CurrentOrderID != 1 {
		t.Fatalf("idle bot did not pick up new order: %+v", snapshot.Bots[0])
	}
}

func TestCompletionAndImmediatePickup(t *testing.T) {
	now := testTime()
	c := New()
	c.CreateOrder(NormalOrder, now)
	c.CreateOrder(NormalOrder, now.Add(time.Second))
	c.AddBot(now.Add(2 * time.Second))

	doneAt := now.Add(12 * time.Second)
	c.Tick(doneAt)
	snapshot := c.Snapshot(doneAt)

	assertIDs(t, completedIDs(snapshot), []int{1})
	if snapshot.Bots[0].Status != BotProcessingStatus || snapshot.Bots[0].CurrentOrderID != 2 {
		t.Fatalf("bot did not immediately pick up next order: %+v", snapshot.Bots[0])
	}
}

func TestRemoveIdleBot(t *testing.T) {
	now := testTime()
	c := New()
	c.AddBot(now)

	removed, ok := c.RemoveNewestBot(now.Add(time.Second))
	if !ok || removed.ID != 1 {
		t.Fatalf("got removed=%+v ok=%v, want bot #1", removed, ok)
	}
	if snapshot := c.Snapshot(now); len(snapshot.Bots) != 0 {
		t.Fatalf("got bots after removal %+v, want none", snapshot.Bots)
	}
}

func TestRemoveProcessingBotReturnsOrderToPriorityPosition(t *testing.T) {
	now := testTime()
	c := New()
	c.CreateOrder(NormalOrder, now)
	c.CreateOrder(NormalOrder, now.Add(time.Second))
	c.AddBot(now.Add(2 * time.Second))
	c.CreateOrder(VIPOrder, now.Add(3*time.Second))
	c.CreateOrder(NormalOrder, now.Add(4*time.Second))

	c.RemoveNewestBot(now.Add(5 * time.Second))
	snapshot := c.Snapshot(now.Add(5 * time.Second))

	if len(snapshot.Bots) != 0 {
		t.Fatalf("got bots after removal %+v, want none", snapshot.Bots)
	}
	assertIDs(t, pendingIDs(snapshot), []int{3, 1, 2, 4})
}

func TestInterruptedOrderDoesNotCompleteLater(t *testing.T) {
	now := testTime()
	c := New()
	c.CreateOrder(NormalOrder, now)
	c.AddBot(now.Add(time.Second))
	c.RemoveNewestBot(now.Add(5 * time.Second))

	c.Tick(now.Add(20 * time.Second))
	snapshot := c.Snapshot(now.Add(20 * time.Second))

	if len(snapshot.Completed) != 0 {
		t.Fatalf("got completed orders %+v, want none", snapshot.Completed)
	}
	assertIDs(t, pendingIDs(snapshot), []int{1})
}

func TestNoDuplicateCompletion(t *testing.T) {
	now := testTime()
	c := New()
	c.CreateOrder(NormalOrder, now)
	c.AddBot(now)

	c.Tick(now.Add(10 * time.Second))
	c.Tick(now.Add(20 * time.Second))

	assertIDs(t, completedIDs(c.Snapshot(now.Add(20*time.Second))), []int{1})
}
