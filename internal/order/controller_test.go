package order

import (
	"reflect"
	"testing"
	"time"
)

func TestVIPOrdersAreQueuedBeforeNormalOrders(t *testing.T) {
	controller := NewController(testStart())

	normal1 := controller.AddNormalOrder()
	vip1 := controller.AddVIPOrder()
	normal2 := controller.AddNormalOrder()
	vip2 := controller.AddVIPOrder()

	got := orderIDs(controller.Snapshot().Pending)
	want := []int{vip1, vip2, normal1, normal2}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order ids = %v, want %v", got, want)
	}
}

func TestBotCompletesOrdersAfterTenSeconds(t *testing.T) {
	controller := NewController(testStart())

	first := controller.AddVIPOrder()
	second := controller.AddNormalOrder()
	controller.AddBot()

	controller.Advance(9 * time.Second)
	if got := len(controller.Snapshot().Completed); got != 0 {
		t.Fatalf("completed before 10 seconds = %d, want 0", got)
	}

	controller.Advance(1 * time.Second)
	snapshot := controller.Snapshot()
	if got, want := orderIDs(snapshot.Completed), []int{first}; !reflect.DeepEqual(got, want) {
		t.Fatalf("completed after 10 seconds = %v, want %v", got, want)
	}
	if got, want := processingIDs(snapshot.Processing), []int{second}; !reflect.DeepEqual(got, want) {
		t.Fatalf("processing after first completion = %v, want %v", got, want)
	}

	controller.Advance(10 * time.Second)
	snapshot = controller.Snapshot()
	if got, want := orderIDs(snapshot.Completed), []int{first, second}; !reflect.DeepEqual(got, want) {
		t.Fatalf("completed after second 10 seconds = %v, want %v", got, want)
	}
	if got := len(snapshot.IdleBots); got != 1 {
		t.Fatalf("idle bots = %d, want 1", got)
	}
}

func TestDestroyNewestProcessingBotReturnsOrderToPriorityPosition(t *testing.T) {
	controller := NewController(testStart())

	normal1 := controller.AddNormalOrder()
	normal2 := controller.AddNormalOrder()
	controller.AddBot()
	controller.AddBot()
	vip := controller.AddVIPOrder()

	removed, ok := controller.RemoveBot()
	if !ok || removed != 2 {
		t.Fatalf("removed bot = (%d, %v), want (2, true)", removed, ok)
	}

	snapshot := controller.Snapshot()
	if got, want := processingIDs(snapshot.Processing), []int{normal1}; !reflect.DeepEqual(got, want) {
		t.Fatalf("processing orders = %v, want %v", got, want)
	}
	if got, want := orderIDs(snapshot.Pending), []int{vip, normal2}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order ids after bot destroy = %v, want %v", got, want)
	}
}

func TestIdleBotImmediatelyPicksNewOrder(t *testing.T) {
	controller := NewController(testStart())

	controller.AddBot()
	orderID := controller.AddVIPOrder()

	snapshot := controller.Snapshot()
	if got := len(snapshot.Pending); got != 0 {
		t.Fatalf("pending orders = %d, want 0", got)
	}
	if got, want := processingIDs(snapshot.Processing), []int{orderID}; !reflect.DeepEqual(got, want) {
		t.Fatalf("processing orders = %v, want %v", got, want)
	}
}

func testStart() time.Time {
	return time.Date(2026, 7, 2, 8, 0, 0, 0, time.UTC)
}

func orderIDs(orders []OrderView) []int {
	ids := make([]int, 0, len(orders))
	for _, order := range orders {
		ids = append(ids, order.ID)
	}
	return ids
}

func processingIDs(orders []ProcessingView) []int {
	ids := make([]int, 0, len(orders))
	for _, order := range orders {
		ids = append(ids, order.OrderID)
	}
	return ids
}
