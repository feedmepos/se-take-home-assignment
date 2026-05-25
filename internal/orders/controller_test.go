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
