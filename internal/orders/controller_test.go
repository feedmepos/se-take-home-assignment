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

func orderIDs(orders []Order) []int {
	ids := make([]int, len(orders))
	for index, order := range orders {
		ids[index] = order.ID
	}
	return ids
}
