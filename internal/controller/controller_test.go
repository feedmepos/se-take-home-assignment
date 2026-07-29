package controller_test

import (
	"testing"
	"time"

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
