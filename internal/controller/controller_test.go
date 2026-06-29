package controller

import (
	"reflect"
	"testing"
	"time"
)

func TestVIPOrdersAreInsertedAheadOfNormalOrders(t *testing.T) {
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

func TestBotPicksPendingOrderImmediately(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(VIPOrder, now)
	c.AddBot(now)

	snapshot := c.Snapshot()
	if len(snapshot.Pending) != 0 {
		t.Fatalf("pending orders = %v, want empty", snapshot.Pending)
	}
	if len(snapshot.Bots) != 1 {
		t.Fatalf("bots = %v, want one bot", snapshot.Bots)
	}
	if snapshot.Bots[0].Status != BotProcessing || snapshot.Bots[0].CurrentOrderID != 1001 {
		t.Fatalf("bot state = %+v, want processing order #1001", snapshot.Bots[0])
	}
}

func TestBotCompletesAndContinuesNextOrder(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(NormalOrder, now)
	c.AddOrder(NormalOrder, now)
	c.AddBot(now)

	c.AdvanceTo(now.Add(10 * time.Second))

	snapshot := c.Snapshot()
	if got, want := orderIDs(snapshot.Completed), []int{1001}; !reflect.DeepEqual(got, want) {
		t.Fatalf("completed after first advance = %v, want %v", got, want)
	}
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].CurrentOrderID != 1002 {
		t.Fatalf("bot after first completion = %+v, want processing order #1002", snapshot.Bots)
	}

	c.AdvanceTo(now.Add(20 * time.Second))

	snapshot = c.Snapshot()
	if got, want := orderIDs(snapshot.Completed), []int{1001, 1002}; !reflect.DeepEqual(got, want) {
		t.Fatalf("completed after second advance = %v, want %v", got, want)
	}
	if snapshot.Bots[0].Status != BotIdle {
		t.Fatalf("bot status = %s, want %s", snapshot.Bots[0].Status, BotIdle)
	}
}

func TestIdleBotStartsWhenNewOrderArrives(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddBot(now)
	c.AddOrder(NormalOrder, now.Add(time.Second))

	snapshot := c.Snapshot()
	if len(snapshot.Pending) != 0 {
		t.Fatalf("pending orders = %v, want empty", snapshot.Pending)
	}
	if snapshot.Bots[0].Status != BotProcessing || snapshot.Bots[0].CurrentOrderID != 1001 {
		t.Fatalf("bot state = %+v, want processing order #1001", snapshot.Bots[0])
	}
}

func TestRemoveNewestIdleBot(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddBot(now)
	c.AddBot(now)
	c.RemoveBot(now)

	snapshot := c.Snapshot()
	if got, want := botIDs(snapshot.Bots), []int{1}; !reflect.DeepEqual(got, want) {
		t.Fatalf("active bot IDs = %v, want %v", got, want)
	}
}

func TestRemoveProcessingBotReturnsOrderToPriorityQueue(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(NormalOrder, now)
	c.AddOrder(NormalOrder, now)
	c.AddBot(now)
	c.AddOrder(VIPOrder, now)
	c.RemoveBot(now)

	snapshot := c.Snapshot()
	if got, want := orderIDs(snapshot.Pending), []int{1003, 1001, 1002}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs = %v, want %v", got, want)
	}
	if len(snapshot.Bots) != 0 {
		t.Fatalf("active bots = %v, want none", snapshot.Bots)
	}
}

func TestCancelledCompletionEventIsIgnored(t *testing.T) {
	now := testTime()
	c := NewDefault()

	c.AddOrder(NormalOrder, now)
	c.AddBot(now)
	c.RemoveBot(now.Add(time.Second))
	c.AdvanceTo(now.Add(10 * time.Second))

	snapshot := c.Snapshot()
	if got, want := orderIDs(snapshot.Completed), []int{}; !reflect.DeepEqual(got, want) {
		t.Fatalf("completed order IDs = %v, want %v", got, want)
	}
	if got, want := orderIDs(snapshot.Pending), []int{1001}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs = %v, want %v", got, want)
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
