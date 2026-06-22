package order

import (
	"reflect"
	"testing"
	"time"

	"se-take-home-assignment/internal/types"
)

func TestAddOrderUsesIncreasingIDs(t *testing.T) {
	c := NewController(testTime())
	c.AddOrder(types.TypeNormal)
	c.AddOrder(types.TypeVIP)
	c.AddOrder(types.TypeNormal)

	got := orderIDs(c.Snapshot().Pending)
	want := []int{2, 1, 3}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs got %v, want %v", got, want)
	}
}

func TestVIPOrdersQueueBeforeNormalAndBehindOlderVIP(t *testing.T) {
	c := NewController(testTime())
	c.AddOrder(types.TypeNormal) // #1
	c.AddOrder(types.TypeVIP)    // #2
	c.AddOrder(types.TypeNormal) // #3
	c.AddOrder(types.TypeVIP)    // #4

	got := orderIDs(c.Snapshot().Pending)
	want := []int{2, 4, 1, 3}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("pending priority got %v, want %v", got, want)
	}
}

func TestBotImmediatelyProcessesPendingOrder(t *testing.T) {
	c := NewController(testTime())
	c.AddOrder(types.TypeNormal)
	c.AddOrder(types.TypeVIP)
	c.AddBot()

	snap := c.Snapshot()
	if got, want := snap.Processing[0].Order.ID, 2; got != want {
		t.Fatalf("processing order got %d, want %d", got, want)
	}
	if got, want := orderIDs(snap.Pending), []int{1}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs got %v, want %v", got, want)
	}
}

func TestIdleBotProcessesNewOrder(t *testing.T) {
	c := NewController(testTime())
	c.AddBot()
	c.AddOrder(types.TypeNormal)

	snap := c.Snapshot()
	if got, want := len(snap.Pending), 0; got != want {
		t.Fatalf("pending count got %d, want %d", got, want)
	}
	if got, want := snap.Processing[0].Order.ID, 1; got != want {
		t.Fatalf("processing order got %d, want %d", got, want)
	}
}

func TestAdvanceCompletesOrderAfterTenSeconds(t *testing.T) {
	start := testTime()
	c := NewController(start)
	c.AddOrder(types.TypeNormal)
	c.AddBot()

	events := c.Advance(9 * time.Second)
	if got, want := len(events), 0; got != want {
		t.Fatalf("events before duration got %d, want %d", got, want)
	}
	if got, want := len(c.Snapshot().Complete), 0; got != want {
		t.Fatalf("complete before duration got %d, want %d", got, want)
	}

	events = c.Advance(1 * time.Second)
	if got, want := len(events), 1; got != want {
		t.Fatalf("events after duration got %d, want %d", got, want)
	}
	snap := c.Snapshot()
	if got, want := snap.Complete[0].ID, 1; got != want {
		t.Fatalf("complete order got %d, want %d", got, want)
	}
	if got, want := snap.Complete[0].CompletedAt, start.Add(10*time.Second); !got.Equal(want) {
		t.Fatalf("completed at got %s, want %s", got, want)
	}
}

func TestBusyBotContinuesWithNextPendingOrder(t *testing.T) {
	c := NewController(testTime())
	c.AddOrder(types.TypeNormal)
	c.AddOrder(types.TypeVIP)
	c.AddBot()

	c.Advance(10 * time.Second)
	snap := c.Snapshot()
	if got, want := snap.Complete[0].ID, 2; got != want {
		t.Fatalf("complete order got %d, want %d", got, want)
	}
	if got, want := snap.Processing[0].Order.ID, 1; got != want {
		t.Fatalf("next processing order got %d, want %d", got, want)
	}
}

func TestRemoveNewestIdleBot(t *testing.T) {
	c := NewController(testTime())
	c.AddBot()
	c.AddBot()

	events, err := c.RemoveBot()
	if err != nil {
		t.Fatalf("remove bot returned error %v", err)
	}
	if got, want := events[0].BotID, 2; got != want {
		t.Fatalf("removed bot got %d, want %d", got, want)
	}
	if got, want := len(c.Snapshot().Bots), 1; got != want {
		t.Fatalf("bot count got %d, want %d", got, want)
	}
}

func TestRemoveNewestBusyBotRequeuesOrderByPriority(t *testing.T) {
	c := NewController(testTime())
	c.AddOrder(types.TypeNormal) // #1, bot #1 starts it
	c.AddBot()
	c.AddOrder(types.TypeNormal) // #2, bot #2 starts it
	c.AddBot()
	c.AddOrder(types.TypeVIP)    // #3 pending
	c.AddOrder(types.TypeNormal) // #4 pending

	_, err := c.RemoveBot()
	if err != nil {
		t.Fatalf("remove bot returned error %v", err)
	}

	snap := c.Snapshot()
	got := orderIDs(snap.Pending)
	want := []int{3, 2, 4}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("pending after requeue got %v, want %v", got, want)
	}
	if got, want := len(snap.Processing), 1; got != want {
		t.Fatalf("processing count got %d, want %d", got, want)
	}
	if got, want := snap.Processing[0].Order.ID, 1; got != want {
		t.Fatalf("remaining processing order got %d, want %d", got, want)
	}
}

func TestRemoveBotWithoutBotsReturnsError(t *testing.T) {
	c := NewController(testTime())
	_, err := c.RemoveBot()
	if err == nil {
		t.Fatal("remove bot error got nil, want error")
	}
}

func orderIDs(orders []types.Order) []int {
	ids := make([]int, 0, len(orders))
	for _, order := range orders {
		ids = append(ids, order.ID)
	}
	return ids
}

func testTime() time.Time {
	return time.Date(2026, 6, 19, 9, 0, 0, 0, time.UTC)
}
