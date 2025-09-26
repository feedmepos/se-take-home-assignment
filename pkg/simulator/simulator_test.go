package simulator

import (
	"testing"

	"order-controller/pkg/order"
)

func TestSimulator_NewSimulator(t *testing.T) {
	om := order.NewManager()
	sim := NewSimulator(om)
	
	if sim.orderManager != om {
		t.Error("Expected simulator to have the provided order manager")
	}
	
	if sim.GetTotalOrders() != 0 {
		t.Errorf("Expected 0 total orders, got %d", sim.GetTotalOrders())
	}
}

func TestSimulator_OrderCounts(t *testing.T) {
	om := order.NewManager()
	sim := NewSimulator(om)
	
	// Create some orders
	om.CreateOrder(order.NormalOrder)
	om.CreateOrder(order.VIPOrder)
	om.CreateOrder(order.NormalOrder)
	om.CreateOrder(order.VIPOrder)
	
	// Manually update simulator counts (since we're not using the createOrder method)
	sim.totalOrders = 4
	sim.normalOrders = 2
	sim.vipOrders = 2
	
	if sim.GetTotalOrders() != 4 {
		t.Errorf("Expected 4 total orders, got %d", sim.GetTotalOrders())
	}
	
	if sim.GetNormalOrders() != 2 {
		t.Errorf("Expected 2 normal orders, got %d", sim.GetNormalOrders())
	}
	
	if sim.GetVIPOrders() != 2 {
		t.Errorf("Expected 2 VIP orders, got %d", sim.GetVIPOrders())
	}
}

func TestSimulator_GetCompletedOrders(t *testing.T) {
	om := order.NewManager()
	sim := NewSimulator(om)
	
	// Create an order
	ord := om.CreateOrder(order.NormalOrder)
	
	// Initially no completed orders
	if completed := sim.GetCompletedOrders(); completed != 0 {
		t.Errorf("Expected 0 completed orders, got %d", completed)
	}
	
	// Manually set order as completed (for testing)
	ord.Status = order.Complete
	
	if completed := sim.GetCompletedOrders(); completed != 1 {
		t.Errorf("Expected 1 completed order, got %d", completed)
	}
}
