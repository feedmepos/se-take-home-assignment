package order_test

import (
	"testing"
	"time"

	"foundation-cli/internal/business/order"
)

func TestNewOrder_PendingCount(t *testing.T) {
	c := order.NewController()
	c.NewOrder(order.OrderNormal)
	if c.PendingCount() != 1 {
		t.Fatalf("got %d", c.PendingCount())
	}
}

func TestNewOrder_SequentialIDs(t *testing.T) {
	c := order.NewController()
	o1 := c.NewOrder(order.OrderNormal)
	o2 := c.NewOrder(order.OrderVIP)
	if o2.ID != o1.ID+1 {
		t.Fatalf("got %d", o2.ID)
	}
}

func TestAddBot_ProcessesPending(t *testing.T) {
	c := order.NewController()
	c.NewOrder(order.OrderNormal)
	b := c.AddBot()
	if b.Status != order.BotBusy {
		t.Fatalf("want BUSY, got %v", b.Status)
	}
}

func TestAddBot_IdleWithoutOrders(t *testing.T) {
	c := order.NewController()
	if b := c.AddBot(); b.Status != order.BotIdle {
		t.Fatalf("want IDLE")
	}
}

func TestRemoveBot_DestroysNewest(t *testing.T) {
	c := order.NewController()
	_ = c.AddBot()
	b2 := c.AddBot()
	if removed := c.RemoveBot(); removed.ID != b2.ID {
		t.Fatalf("want %d, got %d", b2.ID, removed.ID)
	}
	if c.BotCount() != 1 {
		t.Fatalf("want 1, got %d", c.BotCount())
	}
}

func TestRemoveBot_ReturnsOrder(t *testing.T) {
	c := order.NewController()
	c.NewOrder(order.OrderNormal)
	c.AddBot()
	c.RemoveBot()
	if c.PendingCount() != 1 {
		t.Fatalf("want 1, got %d", c.PendingCount())
	}
}

func TestIdleBot_PicksNewOrder(t *testing.T) {
	c := order.NewController()
	c.AddBot()
	c.NewOrder(order.OrderNormal)
	if c.PendingCount() != 0 {
		t.Fatalf("expected idle bot to pick order, got %d pending", c.PendingCount())
	}
}

func TestProcessingDuration_CompletesOrder(t *testing.T) {
	c := order.NewController(order.WithDuration(50 * time.Millisecond))
	c.NewOrder(order.OrderNormal)
	c.AddBot()
	time.Sleep(100 * time.Millisecond)
	n := c.ProcessCompleted()
	if n != 1 {
		t.Fatalf("want 1 completed, got %d", n)
	}
}

func TestVIP_Priority(t *testing.T) {
	c := order.NewController(order.WithDuration(50 * time.Millisecond))
	c.NewOrder(order.OrderNormal)
	c.NewOrder(order.OrderVIP)
	c.AddBot()
	time.Sleep(100 * time.Millisecond)
	c.ProcessCompleted()
	if c.CompletedCount() != 1 {
		t.Fatalf("want VIP completed, got %d", c.CompletedCount())
	}
}
