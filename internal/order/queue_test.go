package order_test

import (
	"testing"

	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

func ids(orders []*order.Order) []int {
	out := make([]int, len(orders))
	for i, o := range orders {
		out[i] = o.ID
	}
	return out
}

func TestInsertPending_VIPBehindVIPsAheadOfNormals(t *testing.T) {
	var pending []*order.Order
	pending = order.InsertPending(pending, &order.Order{ID: 1, Type: order.TypeNormal, Status: order.StatusPending})
	pending = order.InsertPending(pending, &order.Order{ID: 2, Type: order.TypeVIP, Status: order.StatusPending})
	pending = order.InsertPending(pending, &order.Order{ID: 3, Type: order.TypeNormal, Status: order.StatusPending})
	pending = order.InsertPending(pending, &order.Order{ID: 4, Type: order.TypeVIP, Status: order.StatusPending})

	got := ids(pending)
	want := []int{2, 4, 1, 3}
	if len(got) != len(want) {
		t.Fatalf("len=%d want %d; got=%v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("order mismatch: got %v want %v", got, want)
		}
	}
}

func TestInsertPending_NormalAppendsToTail(t *testing.T) {
	pending := []*order.Order{
		{ID: 1, Type: order.TypeVIP, Status: order.StatusPending},
		{ID: 2, Type: order.TypeNormal, Status: order.StatusPending},
	}
	pending = order.InsertPending(pending, &order.Order{ID: 3, Type: order.TypeNormal, Status: order.StatusPending})
	got := ids(pending)
	want := []int{1, 2, 3}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v want %v", got, want)
		}
	}
}
