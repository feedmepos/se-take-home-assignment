package ordercontroller_test

import (
	"testing"

	"github.com/lijian-bj/se-take-home-assignment/internal/domain/ordercontroller"
)

func orders(ids ...int) []ordercontroller.Order {
	out := make([]ordercontroller.Order, len(ids))
	for i, id := range ids {
		out[i] = ordercontroller.NewOrder(id, ordercontroller.OrderTypeNormal)
	}
	return out
}

func vipOrders(ids ...int) []ordercontroller.Order {
	out := make([]ordercontroller.Order, len(ids))
	for i, id := range ids {
		out[i] = ordercontroller.NewOrder(id, ordercontroller.OrderTypeVIP)
	}
	return out
}

func TestPendingQueue_EnqueueNormal(t *testing.T) {
	var q ordercontroller.PendingQueue
	order := ordercontroller.NewOrder(1, ordercontroller.OrderTypeNormal)
	q.EnqueueNormal(order)

	if len(q.Normal) != 1 || q.Normal[0].ID != 1 {
		t.Fatalf("expected normal segment [1], got %+v", q.Normal)
	}
}

func TestPendingQueue_EnqueueVIPBeforeNormal(t *testing.T) {
	var q ordercontroller.PendingQueue
	q.EnqueueNormal(ordercontroller.NewOrder(1, ordercontroller.OrderTypeNormal))
	q.EnqueueNormal(ordercontroller.NewOrder(2, ordercontroller.OrderTypeNormal))
	q.EnqueueVIP(ordercontroller.NewOrder(3, ordercontroller.OrderTypeVIP))

	flat := q.Flatten()
	if len(flat) != 3 || flat[0].ID != 3 || flat[1].ID != 1 || flat[2].ID != 2 {
		t.Fatalf("expected [V3,N1,N2], got %+v", flat)
	}
}

func TestPendingQueue_DequeueNext_VIPFirst(t *testing.T) {
	q := ordercontroller.PendingQueue{
		VIP:    vipOrders(3),
		Normal: orders(1, 2),
	}

	order, idx, ok := q.DequeueNext()
	if !ok || order.ID != 3 || idx != 0 {
		t.Fatalf("expected VIP #3 at index 0, got order=%+v idx=%d ok=%v", order, idx, ok)
	}
	if q.Len() != 2 {
		t.Fatalf("expected 2 remaining, got %d", q.Len())
	}
}

func TestPendingQueue_ReinsertAt(t *testing.T) {
	tests := []struct {
		name       string
		initial    ordercontroller.PendingQueue
		order      ordercontroller.Order
		index      int
		wantVIP    []int
		wantNormal []int
	}{
		{
			name:       "front",
			initial:    ordercontroller.PendingQueue{Normal: orders(1, 2)},
			order:      ordercontroller.NewOrder(3, ordercontroller.OrderTypeVIP),
			index:      0,
			wantVIP:    []int{3},
			wantNormal: []int{1, 2},
		},
		{
			name:       "middle",
			initial:    ordercontroller.PendingQueue{VIP: vipOrders(3), Normal: orders(1, 2)},
			order:      ordercontroller.NewOrder(5, ordercontroller.OrderTypeNormal),
			index:      2,
			wantVIP:    []int{3},
			wantNormal: []int{1, 5, 2},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := tt.initial
			q.ReinsertAt(tt.order, tt.index)
			assertOrderIDs(t, "vip", q.VIP, tt.wantVIP)
			assertOrderIDs(t, "normal", q.Normal, tt.wantNormal)
		})
	}
}

func TestOrderController_RemoveLatestBotReinserts(t *testing.T) {
	oc := ordercontroller.NewOrderController()
	oc.PlaceVIPOrder()
	oc.PlaceNormalOrder()
	oc.PlaceNormalOrder()
	oc.AddBot()
	oc.TryAssignOrder(1)

	removal, err := oc.RemoveLatestBot()
	if err != nil {
		t.Fatal(err)
	}
	if removal.Interrupted == nil || removal.Interrupted.ID != 1 {
		t.Fatalf("expected interrupted order #1, got %+v", removal.Interrupted)
	}
	if ids := oc.Pending().OrderIDs(); len(ids) != 3 || ids[0] != 1 {
		t.Fatalf("pending=%v want [1,2,3]", ids)
	}
}

func TestPendingQueue_DequeueNext_Empty(t *testing.T) {
	var q ordercontroller.PendingQueue
	_, _, ok := q.DequeueNext()
	if ok {
		t.Fatal("dequeue from empty queue should return false")
	}
}

func TestPendingQueue_DequeueNext_NormalIndex(t *testing.T) {
	q := ordercontroller.PendingQueue{Normal: orders(1, 2)}
	order, idx, ok := q.DequeueNext()
	if !ok || order.ID != 1 || idx != 0 {
		t.Fatalf("expected normal #1 at index 0, got id=%d idx=%d ok=%v", order.ID, idx, ok)
	}
}

func TestPendingQueue_ReinsertAt_Boundaries(t *testing.T) {
	tests := []struct {
		name  string
		index int
		want  []int
	}{
		{"negative clamps to front", -1, []int{9, 1, 2}},
		{"beyond length clamps to end", 99, []int{1, 2, 9}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := ordercontroller.PendingQueue{Normal: orders(1, 2)}
			q.ReinsertAt(ordercontroller.NewOrder(9, ordercontroller.OrderTypeNormal), tt.index)
			if got := q.OrderIDs(); len(got) != len(tt.want) {
				t.Fatalf("order ids=%v want %v", got, tt.want)
			}
			for i, id := range tt.want {
				if got := q.OrderIDs()[i]; got != id {
					t.Fatalf("[%d] id=%d want %d", i, got, id)
				}
			}
		})
	}
}

func TestPendingQueue_OrderIDsAndFlatten(t *testing.T) {
	var q ordercontroller.PendingQueue
	if ids := q.OrderIDs(); len(ids) != 0 {
		t.Fatalf("empty queue ids=%v", ids)
	}
	if flat := q.Flatten(); len(flat) != 0 {
		t.Fatalf("empty flatten=%v", flat)
	}

	q.EnqueueVIP(ordercontroller.NewOrder(2, ordercontroller.OrderTypeVIP))
	q.EnqueueNormal(ordercontroller.NewOrder(1, ordercontroller.OrderTypeNormal))
	if got := q.OrderIDs(); len(got) != 2 || got[0] != 2 || got[1] != 1 {
		t.Fatalf("order ids=%v want [2,1]", got)
	}
}

func assertOrderIDs(t *testing.T, label string, got []ordercontroller.Order, want []int) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("%s: len got %d want %d", label, len(got), len(want))
	}
	for i, id := range want {
		if got[i].ID != id {
			t.Fatalf("%s[%d]: got id=%d want=%d", label, i, got[i].ID, id)
		}
	}
}
