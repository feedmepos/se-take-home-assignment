package clock_test

import (
	"testing"
	"time"

	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/clock"
)

func TestMockClock_AfterFuncFiresOnAdvance(t *testing.T) {
	start := time.Date(2026, 7, 6, 9, 0, 0, 0, time.UTC)
	clk := clock.NewMock(start)

	fired := false
	clk.AfterFunc(10*time.Second, func() {
		fired = true
	})

	clk.Advance(9 * time.Second)
	if fired {
		t.Fatal("timer should not fire before duration elapsed")
	}

	clk.Advance(1 * time.Second)
	if !fired {
		t.Fatal("timer should fire after duration elapsed")
	}
}

func TestMockClock_StopPreventsFire(t *testing.T) {
	clk := clock.NewMock(time.Date(2026, 7, 6, 9, 0, 0, 0, time.UTC))

	fired := false
	handle := clk.AfterFunc(5*time.Second, func() {
		fired = true
	})
	if !handle.Stop() {
		t.Fatal("Stop should succeed on active timer")
	}
	clk.Advance(10 * time.Second)
	if fired {
		t.Fatal("stopped timer should not fire")
	}
}

func TestMockClock_MultipleTimersFireInOrder(t *testing.T) {
	clk := clock.NewMock(time.Date(2026, 7, 6, 9, 0, 0, 0, time.UTC))

	var order []int
	clk.AfterFunc(30*time.Second, func() { order = append(order, 3) })
	clk.AfterFunc(10*time.Second, func() { order = append(order, 1) })
	clk.AfterFunc(20*time.Second, func() { order = append(order, 2) })

	clk.Advance(30 * time.Second)
	if len(order) != 3 || order[0] != 1 || order[1] != 2 || order[2] != 3 {
		t.Fatalf("fire order=%v want [1,2,3]", order)
	}
}

func TestMockClock_NowAdvances(t *testing.T) {
	start := time.Date(2026, 7, 6, 9, 0, 0, 0, time.UTC)
	clk := clock.NewMock(start)
	clk.Advance(5 * time.Minute)
	if got := clk.Now(); !got.Equal(start.Add(5*time.Minute)) {
		t.Fatalf("Now()=%v want %v", got, start.Add(5*time.Minute))
	}
}
