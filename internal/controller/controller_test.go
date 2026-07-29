package controller_test

import (
	"testing"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/bot"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

func TestCreateOrders_IncreasingIDsAndVIPPriority(t *testing.T) {
	c := controller.New(50*time.Millisecond, func(string) {})
	o1 := c.CreateNormalOrder()
	o2 := c.CreateVIPOrder()
	o3 := c.CreateNormalOrder()

	if o1.ID != 1 || o2.ID != 2 || o3.ID != 3 {
		t.Fatalf("ids got %d,%d,%d want 1,2,3", o1.ID, o2.ID, o3.ID)
	}

	snap := c.Snapshot()
	if len(snap.Pending) != 3 {
		t.Fatalf("pending len=%d", len(snap.Pending))
	}
	want := []int{2, 1, 3}
	for i, id := range want {
		if snap.Pending[i].ID != id {
			t.Fatalf("pending order: got %v want %v",
				[]int{snap.Pending[0].ID, snap.Pending[1].ID, snap.Pending[2].ID}, want)
		}
		if snap.Pending[i].Status != order.StatusPending {
			t.Fatalf("order %d status=%s", snap.Pending[i].ID, snap.Pending[i].Status)
		}
	}
}

func TestAddBot_PicksPendingAndCompletes(t *testing.T) {
	c := controller.New(30*time.Millisecond, func(string) {})
	c.CreateVIPOrder()
	c.CreateNormalOrder()
	c.AddBot()

	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snap := c.Snapshot()
		if len(snap.Complete) == 2 && len(snap.Pending) == 0 {
			if snap.Complete[0].ID != 1 || snap.Complete[1].ID != 2 {
				t.Fatalf("complete order: got [%d,%d] want [1,2]", snap.Complete[0].ID, snap.Complete[1].ID)
			}
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("timeout waiting for completions")
}

func TestRemoveBot_RequeuesProcessingOrderWithPriority(t *testing.T) {
	c := controller.New(2*time.Second, func(string) {})
	n := c.CreateNormalOrder()
	c.AddBot()

	// wait until processing starts
	sawProcessing := false
	deadline := time.Now().Add(200 * time.Millisecond)
	for time.Now().Before(deadline) {
		snap := c.Snapshot()
		if len(snap.Bots) == 1 && snap.Bots[0].Status == bot.StatusProcessing {
			sawProcessing = true
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	if !sawProcessing {
		t.Fatal("timeout waiting for bot to enter PROCESSING")
	}

	c.CreateVIPOrder() // VIP while normal is processing / will be requeued
	removed, ok := c.RemoveBot()
	if !ok || removed == nil {
		t.Fatal("expected bot removed")
	}

	snap := c.Snapshot()
	if len(snap.Bots) != 0 {
		t.Fatalf("bots=%d want 0", len(snap.Bots))
	}
	if len(snap.Pending) != 2 {
		t.Fatalf("pending=%d want 2: %+v", len(snap.Pending), snap.Pending)
	}
	// VIP should be ahead of requeued Normal
	if snap.Pending[0].Type != order.TypeVIP || snap.Pending[1].Type != order.TypeNormal {
		t.Fatalf("priority broken: %s then %s", snap.Pending[0].Type, snap.Pending[1].Type)
	}
	if snap.Pending[0].Status != order.StatusPending || snap.Pending[1].Status != order.StatusPending {
		t.Fatal("requeued orders must be PENDING")
	}
	if snap.Pending[1].ID != n.ID {
		t.Fatalf("requeued normal id=%d want %d", snap.Pending[1].ID, n.ID)
	}
}

func TestIdleBot_WakesOnNewOrder(t *testing.T) {
	c := controller.New(20*time.Millisecond, func(string) {})
	c.AddBot()
	time.Sleep(30 * time.Millisecond) // bot becomes idle
	c.CreateNormalOrder()

	deadline := time.Now().Add(300 * time.Millisecond)
	for time.Now().Before(deadline) {
		if len(c.Snapshot().Complete) == 1 {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("idle bot did not process new order")
}
