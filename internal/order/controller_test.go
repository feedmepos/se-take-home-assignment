package order

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestOrderController_New(t *testing.T) {
	oc := NewOrderController()

	assert.Len(t, oc.pendingOrders, 0, "Initial pending orders should be 0")
	assert.Len(t, oc.completedOrders, 0, "Initial completed orders should be 0")
	assert.Equal(t, 0, oc.orderCounter, "Initial order counter should be 0")
}

func TestOrderController_CreateNormalOrder(t *testing.T) {
	oc := NewOrderController()

	oc.CreateOrder(Normal)

	assert.Len(t, oc.pendingOrders, 1, "Pending orders should be 1 after creating a normal order")
	assert.Equal(t, 1, oc.orderCounter, "Order counter should be 1 after creating a normal order")

	order := oc.pendingOrders[0]

	assert.Equal(t, 1, order.ID, "Order ID should be 1")
	assert.Equal(t, Normal, order.Type, "Order type should be Normal")
	assert.NotEmpty(t, order.CreatedAt, "Order created at should not be empty")
}

func TestOrderController_CreateVIPOrder(t *testing.T) {
	oc := NewOrderController()

	oc.CreateOrder(VIP)

	assert.Len(t, oc.pendingOrders, 1, "Pending orders should be 1 after creating a VIP order")
	assert.Equal(t, 1, oc.orderCounter, "Order counter should be 1 after creating a VIP order")

	order := oc.pendingOrders[0]

	assert.Equal(t, 1, order.ID, "Order ID should be 1")
	assert.Equal(t, VIP, order.Type, "Order type should be VIPVIP")
	assert.NotEmpty(t, order.CreatedAt, "Order created at should not be empty")
}

func TestOrderController_GetNextPendingOrder(t *testing.T) {
	oc := NewOrderController()

	oc.CreateOrder(Normal)

	order := oc.GetNextPendingOrder()

	assert.NotNil(t, order, "Expected an order to be returned")
	assert.Equal(t, 1, order.ID, "Order ID should be 1")
	assert.Equal(t, Normal, order.Type, "Order type should be Normal")

}

func TestOrderController_GetNextPendingOrderVIP(t *testing.T) {
	oc := NewOrderController()

	oc.CreateOrder(Normal)
	oc.CreateOrder(VIP)

	order := oc.GetNextPendingOrder()

	assert.NotNil(t, order, "Expected an order to be returned")
	assert.Equal(t, 2, order.ID, "Order ID should be 2")
	assert.Equal(t, VIP, order.Type, "Order type should be VIP")

}

func TestOrderController_GetNextPendingOrderEmpty(t *testing.T) {
	oc := NewOrderController()

	order := oc.GetNextPendingOrder()

	assert.Nil(t, order, "Expected an order to be nil when no pending orders")
}

func TestOrderController_CompleteOrder(t *testing.T) {
	oc := NewOrderController()
	oc.CreateOrder(Normal)

	order := oc.GetNextPendingOrder()
	oc.CompleteOrder(order)

	assert.Len(t, oc.pendingOrders, 0, "Pending orders should be 0 after completing an order")
	assert.Len(t, oc.completedOrders, 1, "Completed orders should be 1 after completing an order")
	assert.Equal(t, Completed, order.Status, "Order status should be Completed")
	assert.NotEmpty(t, order.CompletedAt, "Order completed at should not be empty")
}

func TestOrderController_RequeueOrder(t *testing.T) {
	oc := NewOrderController()
	oc.CreateOrder(Normal)

	order := oc.GetNextPendingOrder()
	oc.ProcessOrder(order)

	assert.Len(t, oc.pendingOrders, 0, "Pending orders should be 0 after processing an order")

	oc.RequeueOrder(order)

	assert.Len(t, oc.pendingOrders, 1, "Pending orders should be 1 after requeuing an order")
	assert.Equal(t, Pending, order.Status, "Order status should be Pending")
	assert.Empty(t, order.CompletedAt, "Order completed at should be empty")
}

func TestOrderController_QueueOrder_NormalShouldBeAtBack(t *testing.T) {
	oc := NewOrderController()

	oc.pendingOrders = []*Order{
		{ID: 1, Type: Normal, Status: Pending},
		{ID: 2, Type: Normal, Status: Pending},
	}

	oc.queueOrder(&Order{ID: 3, Type: Normal, Status: Pending})

	assert.Len(t, oc.pendingOrders, 3, "Pending orders should be 3 after creating orders")

	expectedOrderIDs := []int{1, 2, 3}
	for i, order := range oc.pendingOrders {
		assert.Equal(t, expectedOrderIDs[i], order.ID, "Order ID should match expected priority order")
	}
}

func TestOrderController_QueueOrder_VIPShouldBeAtFront(t *testing.T) {
	oc := NewOrderController()

	oc.pendingOrders = []*Order{
		{ID: 1, Type: Normal, Status: Pending},
		{ID: 2, Type: Normal, Status: Pending},
	}

	oc.queueOrder(&Order{ID: 3, Type: VIP, Status: Pending})

	assert.Len(t, oc.pendingOrders, 3, "Pending orders should be 3 after creating orders")

	expectedOrderIDs := []int{3, 1, 2}
	for i, order := range oc.pendingOrders {
		assert.Equal(t, expectedOrderIDs[i], order.ID, "Order ID should match expected priority order")
	}
}

func TestOrderController_QueueOrder_VIPShouldBeInBetweenVIPandNormalOrders(t *testing.T) {
	oc := NewOrderController()

	oc.pendingOrders = []*Order{
		{ID: 1, Type: VIP, Status: Pending},
		{ID: 2, Type: VIP, Status: Pending},
		{ID: 3, Type: Normal, Status: Pending},
	}

	oc.queueOrder(&Order{ID: 4, Type: VIP, Status: Pending})

	assert.Len(t, oc.pendingOrders, 4, "Pending orders should be 4 after creating orders")

	expectedOrderIDs := []int{1, 2, 4, 3}
	for i, order := range oc.pendingOrders {
		assert.Equal(t, expectedOrderIDs[i], order.ID, "Order ID should match expected priority order")
	}
}

func TestOrderController_QueueOrder_VIPShouldBeAtBackOfVIPOrders(t *testing.T) {
	oc := NewOrderController()

	oc.pendingOrders = []*Order{
		{ID: 1, Type: VIP, Status: Pending},
		{ID: 2, Type: VIP, Status: Pending},
		{ID: 3, Type: VIP, Status: Pending},
	}

	oc.queueOrder(&Order{ID: 4, Type: VIP, Status: Pending})

	assert.Len(t, oc.pendingOrders, 4, "Pending orders should be 4 after creating orders")

	expectedOrderIDs := []int{1, 2, 3, 4}
	for i, order := range oc.pendingOrders {
		assert.Equal(t, expectedOrderIDs[i], order.ID, "Order ID should match expected priority order")
	}
}

func TestOrderController_GetPendingOrdersCount(t *testing.T) {
	oc := NewOrderController()

	oc.CreateOrder(Normal)
	oc.CreateOrder(VIP)

	assert.Equal(t, 2, oc.GetPendingOrdersCount(), "Pending orders count should be 2")
}

func TestOrderController_GetCompletedOrdersCount(t *testing.T) {
	oc := NewOrderController()

	oc.CreateOrder(Normal)
	oc.CreateOrder(VIP)
	oc.CreateOrder(VIP)
	oc.CreateOrder(Normal)
	oc.CreateOrder(VIP)

	oc.CompleteOrder(oc.GetNextPendingOrder())
	oc.CompleteOrder(oc.GetNextPendingOrder())
	oc.CompleteOrder(oc.GetNextPendingOrder())
	oc.CompleteOrder(oc.GetNextPendingOrder())
	oc.CompleteOrder(oc.GetNextPendingOrder())

	assert.Equal(t, 5, oc.GetCompletedOrdersCount(), "Completed orders count should be 4")
	assert.Equal(t, 2, oc.GetCompletedOrdersCount(Normal), "Completed Normal orders count should be 2")
	assert.Equal(t, 3, oc.GetCompletedOrdersCount(VIP), "Completed VIP orders count should be 2")

}
