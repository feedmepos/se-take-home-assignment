package restaurant

import (
	"testing"
	"time"
)

func TestOrderQueueCreatesIncreasingOrderNumbers(t *testing.T) {
	now := time.Date(2026, time.July, 17, 10, 0, 0, 0, time.UTC)
	orders := newOrderQueue()

	first := orders.create(Normal, 1000, now)
	second := orders.create(VIP, 2500, now.Add(time.Second))

	if first.ID != 1 || first.OrderNo != 1001 {
		t.Fatalf("first order = ID %d, number %d; want ID 1, number 1001", first.ID, first.OrderNo)
	}
	if second.ID != 2 || second.OrderNo != 1002 {
		t.Fatalf("second order = ID %d, number %d; want ID 2, number 1002", second.ID, second.OrderNo)
	}
	if second.Status != Pending {
		t.Fatalf("second order status = %s, want PENDING", second.Status)
	}
}

func TestOrderQueueSelectsVIPThenFIFO(t *testing.T) {
	now := time.Date(2026, time.July, 17, 10, 0, 0, 0, time.UTC)
	orders := newOrderQueue()
	normalFirst := orders.create(Normal, 1000, now)
	vipFirst := orders.create(VIP, 1000, now.Add(time.Millisecond))
	vipSecond := orders.create(VIP, 1000, now.Add(2*time.Millisecond))

	if got := orders.takeNextPending(); got != vipFirst {
		t.Fatalf("first pending order = #%d, want first VIP #%d", got.OrderNo, vipFirst.OrderNo)
	}
	vipFirst.Status = Processing
	if got := orders.takeNextPending(); got != vipSecond {
		t.Fatalf("second pending order = #%d, want second VIP #%d", got.OrderNo, vipSecond.OrderNo)
	}
	vipSecond.Status = Processing
	if got := orders.takeNextPending(); got != normalFirst {
		t.Fatalf("third pending order = #%d, want normal #%d", got.OrderNo, normalFirst.OrderNo)
	}
}

func TestOrderQueueReturnsInterruptedOrderToOriginalPosition(t *testing.T) {
	now := time.Date(2026, time.July, 17, 10, 0, 0, 0, time.UTC)
	orders := newOrderQueue()
	first := orders.create(Normal, 1000, now)
	orders.create(Normal, 1000, now.Add(time.Millisecond))

	taken := orders.takeNextPending()
	taken.Status = Processing
	orders.returnToPending(taken)

	if got := orders.takeNextPending(); got != first {
		t.Fatalf("returned order = #%d, want original first order #%d", got.OrderNo, first.OrderNo)
	}
}
