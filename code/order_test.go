package code

import (
	"testing"
)

// TestController provides a controller for testing
func NewTestController() *Controller {
	return NewController(func(format string, args ...interface{}) {
		// Silent logging during tests
	})
}

func TestCreateNormalOrder(t *testing.T) {
	c := NewTestController()

	order, err := c.NewOrder("NORMAL")

	if err != nil {
		t.Fatalf("Order creation failed: %v", err)
	}

	if order.Type != "NORMAL" {
		t.Errorf("Expected NORMAL, got %s", order.Type)
	}

	if c.GetTotalNormal() != 1 {
		t.Errorf("Expected TotalNormal=1, got %d", c.GetTotalNormal())
	}
}

func TestCreateVIPOrder(t *testing.T) {
	c := NewTestController()

	order, err := c.NewOrder("VIP")

	if err != nil {
		t.Fatalf("Order creation failed: %v", err)
	}

	if order.Type != "VIP" {
		t.Errorf("Expected VIP, got %s", order.Type)
	}

	if c.GetTotalVIP() != 1 {
		t.Errorf("Expected TotalVIP=1, got %d", c.GetTotalVIP())
	}
}

func TestInvalidOrderType(t *testing.T) {
	c := NewTestController()

	order, err := c.NewOrder("INVALID")

	if err == nil {
		t.Error("Expected error for invalid order type")
	}
	if order != nil {
		t.Error("Expected nil order for invalid type")
	}
}

func TestOrderIDIncrements(t *testing.T) {
	c := NewTestController()

	order1, _ := c.NewOrder("NORMAL")
	order2, _ := c.NewOrder("NORMAL")

	if order2.ID != order1.ID+1 {
		t.Errorf("Order IDs not sequential: %d then %d", order1.ID, order2.ID)
	}
}

func TestGetNextOrderFromEmptyQueue(t *testing.T) {
	c := NewTestController()

	order := c.GetNextOrder()

	if order != nil {
		t.Error("Expected nil from empty queue")
	}
}

func TestGetNextOrderPriority(t *testing.T) {
	c := NewTestController()

	c.NewOrder("NORMAL")
	c.NewOrder("VIP")

	order := c.GetNextOrder()

	if order.Type != "VIP" {
		t.Errorf("Expected VIP first, got %s", order.Type)
	}
}

func TestGetNextOrderNormalOnly(t *testing.T) {
	c := NewTestController()

	c.NewOrder("NORMAL")
	c.NewOrder("NORMAL")

	order1 := c.GetNextOrder()
	order2 := c.GetNextOrder()

	if order1.Type != "NORMAL" {
		t.Errorf("Expected NORMAL, got %s", order1.Type)
	}
	if order2.Type != "NORMAL" {
		t.Errorf("Expected NORMAL, got %s", order2.Type)
	}
}

func TestGetNextOrderVIPOnly(t *testing.T) {
	c := NewTestController()

	c.NewOrder("VIP")
	c.NewOrder("VIP")

	order1 := c.GetNextOrder()
	order2 := c.GetNextOrder()

	if order1.Type != "VIP" {
		t.Errorf("Expected VIP, got %s", order1.Type)
	}
	if order2.Type != "VIP" {
		t.Errorf("Expected VIP, got %s", order2.Type)
	}
}

func TestFIFOWithinSameType(t *testing.T) {
	c := NewTestController()

	order1, _ := c.NewOrder("NORMAL")
	order2, _ := c.NewOrder("NORMAL")

	first := c.GetNextOrder()
	second := c.GetNextOrder()

	if first.ID != order1.ID {
		t.Errorf("Expected first order ID %d, got %d", order1.ID, first.ID)
	}
	if second.ID != order2.ID {
		t.Errorf("Expected second order ID %d, got %d", order2.ID, second.ID)
	}
}

func TestMixedQueueOrdering(t *testing.T) {
	c := NewTestController()

	c.NewOrder("VIP")
	c.NewOrder("NORMAL")
	c.NewOrder("VIP")
	c.NewOrder("NORMAL")

	order1 := c.GetNextOrder()
	order2 := c.GetNextOrder()
	order3 := c.GetNextOrder()
	order4 := c.GetNextOrder()

	if order1.Type != "VIP" {
		t.Error("First order should be VIP")
	}
	if order2.Type != "VIP" {
		t.Error("Second order should be VIP")
	}
	if order3.Type != "NORMAL" {
		t.Error("Third order should be NORMAL")
	}
	if order4.Type != "NORMAL" {
		t.Error("Fourth order should be NORMAL")
	}
}
