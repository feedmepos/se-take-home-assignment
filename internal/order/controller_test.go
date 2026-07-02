package order

import (
	"testing"
	"time"
)

func newTestController() *Controller {
	return NewController(time.Date(2026, 7, 1, 14, 32, 0, 0, time.UTC))
}

func TestVIPOrdersAreQueuedBeforeNormalOrders(t *testing.T) {
	controller := newTestController()

	controller.AddOrder(Normal)
	controller.AddOrder(VIP)
	controller.AddOrder(Normal)
	controller.AddOrder(VIP)

	pending := controller.Snapshot().Pending
	got := []int{pending[0].ID, pending[1].ID, pending[2].ID, pending[3].ID}
	want := []int{1002, 1004, 1001, 1003}

	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("pending queue mismatch: got %v, want %v", got, want)
		}
	}
}

func TestBotCompletesOrderAfterTenSecondsAndPicksNextOrder(t *testing.T) {
	controller := newTestController()

	controller.AddOrder(Normal)
	controller.AddOrder(Normal)
	controller.AddBot()

	if got := len(controller.Snapshot().Processing); got != 1 {
		t.Fatalf("processing orders after adding bot = %d, want 1", got)
	}

	events := controller.Advance(9 * time.Second)
	if len(events) != 0 {
		t.Fatalf("expected no completion before 10 seconds, got %d events", len(events))
	}

	events = controller.Advance(1 * time.Second)
	snapshot := controller.Snapshot()
	if got := len(snapshot.Completed); got != 1 {
		t.Fatalf("completed orders = %d, want 1", got)
	}
	if got := len(snapshot.Processing); got != 1 {
		t.Fatalf("processing orders after first completion = %d, want 1", got)
	}
	if events[0].At.Format("15:04:05") != "14:32:10" {
		t.Fatalf("completion timestamp = %s, want 14:32:10", events[0].At.Format("15:04:05"))
	}
}

func TestIdleBotImmediatelyPicksNewOrder(t *testing.T) {
	controller := newTestController()

	controller.AddBot()
	events := controller.AddOrder(VIP)

	snapshot := controller.Snapshot()
	if got := len(snapshot.Pending); got != 0 {
		t.Fatalf("pending orders = %d, want 0", got)
	}
	if got := len(snapshot.Processing); got != 1 {
		t.Fatalf("processing orders = %d, want 1", got)
	}
	if got := events[len(events)-1].Message; got != "Bot #1 picked up VIP Order #1001 - Status: PROCESSING" {
		t.Fatalf("last event = %q", got)
	}
}

func TestRemoveNewestProcessingBotReturnsOrderToPendingQueue(t *testing.T) {
	controller := newTestController()

	controller.AddOrder(Normal)
	controller.AddOrder(Normal)
	controller.AddOrder(VIP)
	controller.AddBot()
	controller.AddBot()

	controller.RemoveNewestBot()

	snapshot := controller.Snapshot()
	if got := len(snapshot.Bots); got != 1 {
		t.Fatalf("active bots = %d, want 1", got)
	}
	if got := len(snapshot.Pending); got != 2 {
		t.Fatalf("pending orders = %d, want 2", got)
	}

	pendingIDs := []int{snapshot.Pending[0].ID, snapshot.Pending[1].ID}
	want := []int{1001, 1002}
	for i := range want {
		if pendingIDs[i] != want[i] {
			t.Fatalf("pending queue mismatch after removing bot: got %v, want %v", pendingIDs, want)
		}
	}
}
