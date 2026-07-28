package restaurant

import (
	"testing"
	"time"
)

func TestVIPOrdersAreAssignedBeforeNormalOrders(t *testing.T) {
	now := time.Date(2026, time.July, 17, 10, 0, 0, 0, time.UTC)
	r := New()

	normalFirst, _ := r.AddOrder(Normal, 1000, now)
	vipFirst, _ := r.AddOrder(VIP, 1000, now.Add(time.Millisecond))
	normalSecond, _ := r.AddOrder(Normal, 1000, now.Add(2*time.Millisecond))
	r.AddRobot("", now.Add(3*time.Millisecond))
	r.AddRobot("", now.Add(4*time.Millisecond))
	robots := r.Snapshot().Robots

	if got := *robots[0].CurrentOrderID; got != vipFirst.ID {
		t.Fatalf("first robot received order %d, want VIP order %d", got, vipFirst.ID)
	}
	if got := *robots[1].CurrentOrderID; got != normalFirst.ID {
		t.Fatalf("second robot received order %d, want earliest normal order %d", got, normalFirst.ID)
	}
	if normalSecond.Status != Pending {
		t.Fatalf("second normal order status = %s, want PENDING", normalSecond.Status)
	}
}

func TestRemovingBusyNewestRobotReturnsOrderToPending(t *testing.T) {
	now := time.Date(2026, time.July, 17, 10, 0, 0, 0, time.UTC)
	r := New()

	order, _ := r.AddOrder(Normal, 1000, now)
	r.AddRobot("", now)
	if order.ProductionStartedAt == nil {
		t.Fatal("order should be processing before removing the robot")
	}

	if _, err := r.RemoveNewestRobot(now.Add(time.Second)); err != nil {
		t.Fatalf("RemoveNewestRobot() error = %v", err)
	}
	if robots := r.Snapshot().Robots; len(robots) != 0 {
		t.Fatalf("robots remaining = %d, want 0", len(robots))
	}
	if order.Status != Pending {
		t.Fatalf("order status = %s, want PENDING", order.Status)
	}
	if order.ProductionStartedAt != nil {
		t.Fatal("production start time should be cleared when a robot is removed")
	}
}

func TestCompletedRobotImmediatelyProcessesNextOrder(t *testing.T) {
	now := time.Date(2026, time.July, 17, 10, 0, 0, 0, time.UTC)
	r := New()

	first, _ := r.AddOrder(Normal, 1000, now)
	second, _ := r.AddOrder(Normal, 1000, now.Add(time.Millisecond))
	r.AddRobot("", now.Add(2*time.Millisecond))

	r.Tick(now.Add(10*time.Second + 2*time.Millisecond))
	if first.Status != Completed {
		t.Fatalf("first order status = %s, want COMPLETED", first.Status)
	}
	if second.Status != Processing {
		t.Fatalf("second order status = %s, want PROCESSING", second.Status)
	}
	robots := r.Snapshot().Robots
	if got := *robots[0].CurrentOrderID; got != second.ID {
		t.Fatalf("robot received order %d, want %d", got, second.ID)
	}

	r.Tick(now.Add(20*time.Second + 2*time.Millisecond))
	if second.Status != Completed {
		t.Fatalf("second order status = %s, want COMPLETED", second.Status)
	}
	robots = r.Snapshot().Robots
	if robots[0].Status != Idle {
		t.Fatalf("robot status = %s, want IDLE", robots[0].Status)
	}
}

func TestOrderNumbersAreUniqueAndIncreasing(t *testing.T) {
	now := time.Date(2026, time.July, 17, 10, 0, 0, 0, time.UTC)
	r := New()

	first, _ := r.AddOrder(Normal, 1000, now)
	second, _ := r.AddOrder(VIP, 1000, now)
	if second.OrderNo != first.OrderNo+1 {
		t.Fatalf("second order number = %d, want %d", second.OrderNo, first.OrderNo+1)
	}
}
