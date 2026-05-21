package sim

import (
	"testing"
)

func TestOrderIDIncreasing(t *testing.T) {

	c := NewController(1001)

	order1 := c.CreateNormalOrder()
	order2 := c.CreateVIPOrder()
	order3 := c.CreateNormalOrder()

	if order1.ID != 1001 || order2.ID != 1002 || order3.ID != 1003 {
		t.Fatalf("expected sequential IDs 1001, 1002, 1003 but got %d, %d, %d", order1.ID, order2.ID, order3.ID)
	}
}

func TestVIPOrderPriority(t *testing.T) {
	c := NewController(1001)

	c.CreateNormalOrder()     // ID 1001
	c.CreateNormalOrder()     // ID 1002
	vip := c.CreateVIPOrder() // ID 1003

	pending := c.PendingOrders()

	// VIP should be 1st in queue
	if pending[0].ID != vip.ID {
		t.Fatalf("expected VIP order ID %d to be first in queue but got ID %d", vip.ID, pending[0].ID)
	}
}

func TestMultipleVIPOrders(t *testing.T) {
	c := NewController(1001)
	vip1 := c.CreateVIPOrder() // ID 1001
	c.CreateNormalOrder()
	vip2 := c.CreateVIPOrder() // ID 1002
	c.CreateNormalOrder()

	pending := c.PendingOrders()

	// VIP orders should be in order of creation
	if pending[0].ID != vip1.ID || pending[1].ID != vip2.ID {
		t.Fatalf("expected VIP orders in order %d, %d but got %d, %d", vip1.ID, vip2.ID, pending[0].ID, pending[1].ID)
	}
}

func TestMixedOrderSequence(t *testing.T) {
	c := NewController(1001)

	c.CreateNormalOrder() // ID 1001
	c.CreateVIPOrder()    // ID 1002
	c.CreateNormalOrder() // ID 1003
	c.CreateVIPOrder()    // ID 1004

	pending := c.PendingOrders()
	// Expected order: [VIP2, VIP4, Normal1, Normal3]
	expected := []int{1002, 1004, 1001, 1003}

	for i, id := range expected {
		if pending[i].ID != id {
			t.Fatalf("position %d: expected ID %d, got ID %d", i, id, pending[i].ID)
		}
	}
}

func TestPendingOrdersReturnsCopy(t *testing.T) {
	c := NewController(1)
	c.CreateNormalOrder()

	pending := c.PendingOrders()
	pending[0].ID = 9999

	original := c.PendingOrders()
	if original[0].ID == 9999 {
		t.Fatal("PendingOrders should return a copy, not a reference to internal state")
	}
}
