package order_test

import (
	"testing"
	"time"

	"order/internal/business/order"
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
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if c.ProcessCompleted() > 0 {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("order not completed within deadline")
}

func TestVIP_Priority(t *testing.T) {
	c := order.NewController(order.WithDuration(50 * time.Millisecond))
	normal := c.NewOrder(order.OrderNormal)
	vip := c.NewOrder(order.OrderVIP)
	c.AddBot()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if c.ProcessCompleted() > 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if c.CompletedCount() != 1 {
		t.Fatalf("expected 1 completed, got %d", c.CompletedCount())
	}
	if normal.Status == order.OrderCompleted && vip.Status != order.OrderCompleted {
		t.Fatalf("Normal completed before VIP")
	}
}

func TestReturnedOrder_PreservesPosition(t *testing.T) {
	c := order.NewController()
	c.NewOrder(order.OrderVIP)
	c.NewOrder(order.OrderNormal)
	c.AddBot()    // picks VIP
	c.AddBot()    // picks Normal
	c.RemoveBot() // destroys Normal's bot

	if c.PendingCount() != 1 {
		t.Fatalf("expected 1 pending (returned Normal), got %d", c.PendingCount())
	}
	// Re-add a bot: should still pick order (returned order is in queue)
	bot := c.AddBot()
	if bot.Status != order.BotBusy {
		t.Fatalf("expected returned order to be picked, bot idle")
	}
}
