package controller

import (
	"reflect"
	"testing"
	"time"
)

func TestVIPAndNormalQueuesKeepPriorityAndFIFO(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(NormalOrder, now)
	c.AddOrder(NormalOrder, now)
	c.AddOrder(VIPOrder, now)
	c.AddOrder(VIPOrder, now)

	got := orderIDs(c.Snapshot().Pending)
	want := []int{1003, 1004, 1001, 1002}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs = %v, want %v", got, want)
	}
}

func TestAddBotAssignsVIPBeforeNormal(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(NormalOrder, now)
	c.AddOrder(VIPOrder, now)
	botID, _ := c.AddBot(now)
	assignment, _ := c.AssignNextOrder(botID, now)

	if assignment == nil || assignment.OrderID != 1002 {
		t.Fatalf("assignment = %+v, want VIP order #1002", assignment)
	}

	snapshot := c.Snapshot()
	if got, want := orderIDs(snapshot.Pending), []int{1001}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs = %v, want %v", got, want)
	}
	if snapshot.Bots[0].Status != BotProcessing {
		t.Fatalf("bot status = %s, want %s", snapshot.Bots[0].Status, BotProcessing)
	}
}

func TestCompleteOrderMakesBotContinueNextOrder(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(NormalOrder, now)
	c.AddOrder(NormalOrder, now)
	botID, _ := c.AddBot(now)
	c.AssignNextOrder(botID, now)

	next, _ := c.CompleteOrder(botID, 1001, now.Add(10*time.Second), 10*time.Second)
	if next == nil || next.OrderID != 1002 {
		t.Fatalf("next assignment = %+v, want order #1002", next)
	}

	snapshot := c.Snapshot()
	if got, want := orderIDs(snapshot.Completed), []int{1001}; !reflect.DeepEqual(got, want) {
		t.Fatalf("completed order IDs = %v, want %v", got, want)
	}
	if got, want := orderIDs(snapshot.Processing), []int{1002}; !reflect.DeepEqual(got, want) {
		t.Fatalf("processing order IDs = %v, want %v", got, want)
	}
}

func TestRemoveProcessingBotReturnsOrderToItsQueue(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(NormalOrder, now)
	c.AddOrder(NormalOrder, now)
	botID, _ := c.AddBot(now)
	c.AssignNextOrder(botID, now)
	c.AddOrder(VIPOrder, now)
	c.RemoveNewestBot(now)

	snapshot := c.Snapshot()
	if got, want := orderIDs(snapshot.Pending), []int{1003, 1002}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs before cancel event = %v, want %v", got, want)
	}
	if got, want := orderIDs(snapshot.Processing), []int{1001}; !reflect.DeepEqual(got, want) {
		t.Fatalf("processing order IDs before cancel event = %v, want %v", got, want)
	}
	if len(snapshot.Bots) != 0 {
		t.Fatalf("active bots = %v, want none", snapshot.Bots)
	}

	c.CancelOrder(botID, 1001, now, time.Second)
	if got, want := orderIDs(c.Snapshot().Pending), []int{1003, 1001, 1002}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs after cancel event = %v, want %v", got, want)
	}
}

func TestCanceledVIPOrderReturnsAheadOfNormalOrders(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(VIPOrder, now)
	c.AddOrder(NormalOrder, now)
	botID, _ := c.AddBot(now)
	c.AssignNextOrder(botID, now)
	c.RemoveNewestBot(now)
	c.CancelOrder(botID, 1001, now, time.Second)

	if got, want := orderIDs(c.Snapshot().Pending), []int{1001, 1002}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs after VIP cancel = %v, want %v", got, want)
	}
}

func TestLateCompletedEventAfterBotRemovalReturnsOrderToPending(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(NormalOrder, now)
	c.AddOrder(NormalOrder, now)
	botID, _ := c.AddBot(now)
	c.AssignNextOrder(botID, now)
	c.RemoveNewestBot(now)

	next, _ := c.CompleteOrder(botID, 1001, now.Add(10*time.Second), 10*time.Second)
	if next != nil {
		t.Fatalf("next assignment = %+v, want nil after removed bot completes late", next)
	}

	snapshot := c.Snapshot()
	if got, want := orderIDs(snapshot.Pending), []int{1001, 1002}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs after late completed event = %v, want %v", got, want)
	}
	if got := orderIDs(snapshot.Completed); len(got) != 0 {
		t.Fatalf("completed order IDs after late completed event = %v, want none", got)
	}
}

func TestRemoveIdleBot(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddBot(now)
	c.AddBot(now)
	c.RemoveNewestBot(now)

	snapshot := c.Snapshot()
	if got, want := botIDs(snapshot.Bots), []int{1}; !reflect.DeepEqual(got, want) {
		t.Fatalf("active bot IDs = %v, want %v", got, want)
	}
}

func testTime() time.Time {
	return time.Date(2026, 6, 29, 14, 32, 1, 0, time.UTC)
}

func orderIDs(orders []OrderView) []int {
	ids := make([]int, 0, len(orders))
	for _, order := range orders {
		ids = append(ids, order.ID)
	}
	return ids
}

func botIDs(bots []BotView) []int {
	ids := make([]int, 0, len(bots))
	for _, bot := range bots {
		ids = append(ids, bot.ID)
	}
	return ids
}
