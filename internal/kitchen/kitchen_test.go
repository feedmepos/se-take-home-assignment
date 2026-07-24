package kitchen

import (
	"reflect"
	"testing"
	"time"
)

func newTestKitchen() *Kitchen {
	k := New()
	k.processingDuration = 100 * time.Millisecond // reduce processing time to 100ms instead of 10 seconds for testing convenience
	return k
}

func TestVIPOrdersQueueBeforeNormalOrdersAndBehindExistingVIPOrders(t *testing.T) {
	k := newTestKitchen()

	normal1 := k.AddOrder(Normal)
	vip1 := k.AddOrder(VIP)
	normal2 := k.AddOrder(Normal)
	vip2 := k.AddOrder(VIP)

	want := []int{vip1, vip2, normal1, normal2}
	if got := k.PendingIDs(); !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order mismatch: got %v, want %v", got, want)
	}
}

func TestBotProcessesOneOrderAtATimeAndThenPicksNextOrder(t *testing.T) {
	k := newTestKitchen()

	order1 := k.AddOrder(Normal)
	order2 := k.AddOrder(Normal)
	botID := k.AddBot()

	if got := k.ProcessingOrders(); got[botID] != order1 {
		t.Fatalf("bot should process first order: got %v, want order %d", got, order1)
	}

	time.Sleep(10 * time.Millisecond)
	if got := k.CompletedIDs(); len(got) != 0 {
		t.Fatalf("order completed too early: got %v", got)
	}

	deadline := time.Now().Add(time.Second)
	for len(k.CompletedIDs()) == 0 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if got := k.CompletedIDs(); !reflect.DeepEqual(got, []int{order1}) {
		t.Fatalf("completed orders mismatch: got %v, want [%d]", got, order1)
	}
	if got := k.ProcessingOrders(); got[botID] != order2 {
		t.Fatalf("bot should pick second order: got %v, want order %d", got, order2)
	}
}

func TestWaitUntilIdleReturnsAfterAllOrdersComplete(t *testing.T) {
	k := newTestKitchen()

	first := k.AddOrder(Normal)
	second := k.AddOrder(VIP)
	k.AddBot()

	k.WaitUntilIdle()

	if got := k.CompletedIDs(); !reflect.DeepEqual(got, []int{second, first}) {
		t.Fatalf("completed orders mismatch: got %v, want [%d %d]", got, second, first)
	}
	if got := k.ProcessingOrders(); len(got) != 0 {
		t.Fatalf("orders still processing after wait: got %v", got)
	}
}

func TestRemovingNewestProcessingBotReturnsOrderToPriorityPosition(t *testing.T) {
	k := newTestKitchen()

	normal1 := k.AddOrder(Normal)
	vip1 := k.AddOrder(VIP)
	normal2 := k.AddOrder(Normal)

	k.AddBot()
	k.AddBot()

	processing := k.ProcessingOrders()
	if processing[2] != normal1 {
		t.Fatalf("newest bot setup mismatch: bot 2 processing %d, want normal order %d", processing[2], normal1)
	}

	k.RemoveBot()

	if got := k.BotCount(); got != 1 {
		t.Fatalf("bot count mismatch: got %d, want 1", got)
	}
	wantPending := []int{normal1, normal2}
	if got := k.PendingIDs(); !reflect.DeepEqual(got, wantPending) {
		t.Fatalf("returned order position mismatch: got %v, want %v", got, wantPending)
	}
	if got := k.ProcessingOrders(); got[1] != vip1 {
		t.Fatalf("remaining bot should continue existing order: got %v, want bot 1 order %d", got, vip1)
	}

	deadline := time.Now().Add(time.Second)
	for len(k.CompletedIDs()) == 0 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	time.Sleep(10 * time.Millisecond)
	if got := k.CompletedIDs(); !reflect.DeepEqual(got, []int{vip1}) {
		t.Fatalf("removed bot completed a returned order: got %v, want [%d]", got, vip1)
	}
	if got := k.ProcessingOrders(); got[1] != normal1 {
		t.Fatalf("remaining bot should pick returned order: got %v, want bot 1 order %d", got, normal1)
	}
}

func TestIdleBotImmediatelyProcessesNewOrder(t *testing.T) {
	k := newTestKitchen()

	botID := k.AddBot()
	orderID := k.AddOrder(VIP)

	if got := k.PendingIDs(); len(got) != 0 {
		t.Fatalf("new order should not remain pending with idle bot: got %v", got)
	}
	if got := k.ProcessingOrders(); got[botID] != orderID {
		t.Fatalf("idle bot did not pick new order: got %v, want order %d", got, orderID)
	}
}
