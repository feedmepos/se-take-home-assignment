// ABOUTME: Tests the order controller business rules for orders and cooking bots.
// ABOUTME: Keeps scheduling behavior independent from CLI input and output.
package orders

import (
	"testing"
	"time"
)

func TestNormalOrderStartsPending(t *testing.T) {
	controller := NewController()
	at := time.Date(2026, 5, 25, 9, 0, 0, 0, time.UTC)

	controller.AddOrder(NormalOrder, at)

	snapshot := controller.Snapshot()
	if len(snapshot.PendingOrders) != 1 {
		t.Fatalf("pending orders count = %d, want 1", len(snapshot.PendingOrders))
	}

	order := snapshot.PendingOrders[0]
	if order.ID != 1 {
		t.Fatalf("order ID = %d, want 1", order.ID)
	}
	if order.Type != NormalOrder {
		t.Fatalf("order type = %s, want %s", order.Type, NormalOrder)
	}
	if order.Status != Pending {
		t.Fatalf("order status = %s, want %s", order.Status, Pending)
	}
}

func TestVIPOrdersQueueBeforeNormalOrders(t *testing.T) {
	controller := NewController()
	start := time.Date(2026, 5, 25, 9, 0, 0, 0, time.UTC)

	controller.AddOrder(NormalOrder, start)
	controller.AddOrder(VIPOrder, start.Add(time.Second))
	controller.AddOrder(NormalOrder, start.Add(2*time.Second))
	controller.AddOrder(VIPOrder, start.Add(3*time.Second))

	snapshot := controller.Snapshot()
	got := orderIDs(snapshot.PendingOrders)
	want := []int{2, 4, 1, 3}

	if len(got) != len(want) {
		t.Fatalf("pending order IDs = %v, want %v", got, want)
	}
	for index := range want {
		if got[index] != want[index] {
			t.Fatalf("pending order IDs = %v, want %v", got, want)
		}
	}
}

func TestBotImmediatelyPicksPendingOrder(t *testing.T) {
	controller := NewController()
	start := time.Date(2026, 5, 25, 9, 0, 0, 0, time.UTC)

	controller.AddOrder(NormalOrder, start)
	controller.AddBot(start.Add(time.Second))

	snapshot := controller.Snapshot()
	if len(snapshot.PendingOrders) != 0 {
		t.Fatalf("pending orders count = %d, want 0", len(snapshot.PendingOrders))
	}
	if len(snapshot.Bots) != 1 {
		t.Fatalf("bot count = %d, want 1", len(snapshot.Bots))
	}

	bot := snapshot.Bots[0]
	if bot.ID != 1 {
		t.Fatalf("bot ID = %d, want 1", bot.ID)
	}
	if bot.Status != BotProcessing {
		t.Fatalf("bot status = %s, want %s", bot.Status, BotProcessing)
	}
	if bot.CurrentOrder == nil {
		t.Fatal("bot current order is nil, want order #1")
	}
	if bot.CurrentOrder.ID != 1 {
		t.Fatalf("bot current order ID = %d, want 1", bot.CurrentOrder.ID)
	}
	if bot.CurrentOrder.Status != Processing {
		t.Fatalf("bot current order status = %s, want %s", bot.CurrentOrder.Status, Processing)
	}
}

func TestBotCompletesOrderAfterTenSecondsAndPicksNextOrder(t *testing.T) {
	controller := NewController()
	start := time.Date(2026, 5, 25, 9, 0, 0, 0, time.UTC)

	controller.AddOrder(NormalOrder, start)
	controller.AddOrder(NormalOrder, start.Add(time.Second))
	controller.AddBot(start.Add(2 * time.Second))

	controller.AdvanceTo(start.Add(12 * time.Second))

	snapshot := controller.Snapshot()
	if len(snapshot.CompletedOrders) != 1 {
		t.Fatalf("completed orders count = %d, want 1", len(snapshot.CompletedOrders))
	}
	if snapshot.CompletedOrders[0].ID != 1 {
		t.Fatalf("completed order ID = %d, want 1", snapshot.CompletedOrders[0].ID)
	}
	if snapshot.CompletedOrders[0].Status != Complete {
		t.Fatalf("completed order status = %s, want %s", snapshot.CompletedOrders[0].Status, Complete)
	}
	if len(snapshot.PendingOrders) != 0 {
		t.Fatalf("pending orders count = %d, want 0", len(snapshot.PendingOrders))
	}

	bot := snapshot.Bots[0]
	if bot.Status != BotProcessing {
		t.Fatalf("bot status = %s, want %s", bot.Status, BotProcessing)
	}
	if bot.CurrentOrder == nil {
		t.Fatal("bot current order is nil, want order #2")
	}
	if bot.CurrentOrder.ID != 2 {
		t.Fatalf("bot current order ID = %d, want 2", bot.CurrentOrder.ID)
	}
	if !bot.CurrentOrder.PickedUpAt.Equal(start.Add(12 * time.Second)) {
		t.Fatalf("bot picked up next order at %s, want %s", bot.CurrentOrder.PickedUpAt, start.Add(12*time.Second))
	}
}

func TestIdleBotPicksNewOrderImmediately(t *testing.T) {
	controller := NewController()
	start := time.Date(2026, 5, 25, 9, 0, 0, 0, time.UTC)

	controller.AddBot(start)
	controller.AddOrder(VIPOrder, start.Add(time.Second))

	snapshot := controller.Snapshot()
	if len(snapshot.PendingOrders) != 0 {
		t.Fatalf("pending orders count = %d, want 0", len(snapshot.PendingOrders))
	}

	bot := snapshot.Bots[0]
	if bot.Status != BotProcessing {
		t.Fatalf("bot status = %s, want %s", bot.Status, BotProcessing)
	}
	if bot.CurrentOrder == nil {
		t.Fatal("bot current order is nil, want order #1")
	}
	if bot.CurrentOrder.ID != 1 {
		t.Fatalf("bot current order ID = %d, want 1", bot.CurrentOrder.ID)
	}
	if bot.CurrentOrder.Type != VIPOrder {
		t.Fatalf("bot current order type = %s, want %s", bot.CurrentOrder.Type, VIPOrder)
	}
	if !bot.CurrentOrder.PickedUpAt.Equal(start.Add(time.Second)) {
		t.Fatalf("bot picked up order at %s, want %s", bot.CurrentOrder.PickedUpAt, start.Add(time.Second))
	}
}

func orderIDs(orders []Order) []int {
	ids := make([]int, len(orders))
	for index, order := range orders {
		ids[index] = order.ID
	}
	return ids
}
