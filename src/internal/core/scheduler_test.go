package core

import (
	"testing"
	"time"

	"se-order/src/internal/clock"
	"se-order/src/internal/core/model"
)

func TestAdvanceCompletesOrdersAndReusesBot(t *testing.T) {
	clk := clock.NewFake(time.Date(2026, 4, 16, 10, 0, 0, 0, time.UTC))
	controller := NewController(clk, 10*time.Second)

	controller.NewOrder(model.PriorityNormal)
	controller.NewOrder(model.PriorityVIP)
	controller.AddBot()

	snapshot := controller.Snapshot()
	if got := snapshot.Processing; len(got) != 1 || got[0] != "bot:1001->order:10000002" {
		t.Fatalf("processing = %v, want [bot:1001->order:10000002]", got)
	}

	controller.Tick(10 * time.Second)
	snapshot = controller.Snapshot()
	if got := snapshot.Complete; len(got) != 1 || got[0] != 10000002 {
		t.Fatalf("complete = %v, want [10000002]", got)
	}
	if got := snapshot.Processing; len(got) != 1 || got[0] != "bot:1001->order:10000001" {
		t.Fatalf("processing = %v, want [bot:1001->order:10000001]", got)
	}
}
