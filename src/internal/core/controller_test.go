package core

import (
	"testing"
	"time"

	"se-order/src/internal/clock"
	"se-order/src/internal/core/model"
)

func TestVIPOrderPriority(t *testing.T) {
	clk := clock.NewFake(time.Date(2026, 4, 16, 10, 0, 0, 0, time.UTC))
	controller := NewController(clk, 10*time.Second)

	controller.NewOrder(model.PriorityNormal)
	controller.NewOrder(model.PriorityNormal)
	controller.NewOrder(model.PriorityVIP)

	snapshot := controller.Snapshot()
	if got, want := snapshot.PendingVIP, []int{10000003}; len(got) != len(want) || got[0] != want[0] {
		t.Fatalf("pending vip = %v, want %v", got, want)
	}
	if got, want := snapshot.PendingNormal, []int{10000001, 10000002}; len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("pending normal = %v, want %v", got, want)
	}
}

func TestRemoveBusyBotReturnsOrderToPending(t *testing.T) {
	clk := clock.NewFake(time.Date(2026, 4, 16, 10, 0, 0, 0, time.UTC))
	controller := NewController(clk, 10*time.Second)

	controller.NewOrder(model.PriorityNormal)
	controller.AddBot()

	events, err := controller.RemoveBot()
	if err != nil {
		t.Fatalf("RemoveBot error = %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("RemoveBot events len = %d, want 1", len(events))
	}
	snapshot := controller.Snapshot()
	if got := snapshot.PendingNormal; len(got) != 1 || got[0] != 10000001 {
		t.Fatalf("pending normal = %v, want [10000001]", got)
	}
	if got := snapshot.Bots; len(got) != 0 {
		t.Fatalf("bots = %v, want []", got)
	}
}

func TestFormatIDs(t *testing.T) {
	if got := model.FormatOrderID(10000012); got != "10000012" {
		t.Fatalf("FormatOrderID = %q, want %q", got, "10000012")
	}
	if got := model.FormatBotID(1007); got != "1007" {
		t.Fatalf("FormatBotID = %q, want %q", got, "1007")
	}
}
