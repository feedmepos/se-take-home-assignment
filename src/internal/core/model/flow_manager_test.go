package model

import "testing"

func TestFlowManagerNextPendingPrioritizesVIPThenNormal(t *testing.T) {
	flow := NewFlowManager()

	normalOne := NewOrder(10000001, PriorityNormal, OrderStatusPending)
	vipOne := NewOrder(10000002, PriorityVIP, OrderStatusPending)
	normalTwo := NewOrder(10000003, PriorityNormal, OrderStatusPending)
	vipTwo := NewOrder(10000004, PriorityVIP, OrderStatusPending)

	flow.Enqueue(normalOne)
	flow.Enqueue(vipOne)
	flow.Enqueue(normalTwo)
	flow.Enqueue(vipTwo)

	first, ok := flow.NextPending()
	if !ok || first.ID() != 10000002 {
		t.Fatalf("first pending = %v, want VIP order 10000002", first)
	}

	second, ok := flow.NextPending()
	if !ok || second.ID() != 10000004 {
		t.Fatalf("second pending = %v, want VIP order 10000004", second)
	}

	third, ok := flow.NextPending()
	if !ok || third.ID() != 10000001 {
		t.Fatalf("third pending = %v, want normal order 10000001", third)
	}

	fourth, ok := flow.NextPending()
	if !ok || fourth.ID() != 10000003 {
		t.Fatalf("fourth pending = %v, want normal order 10000003", fourth)
	}
}

func TestFlowManagerRequeuePreservesPriorityBucket(t *testing.T) {
	flow := NewFlowManager()

	vipOrder := NewOrder(10000001, PriorityVIP, OrderStatusProcessing)
	normalOrder := NewOrder(10000002, PriorityNormal, OrderStatusProcessing)

	flow.Requeue(normalOrder)
	flow.Requeue(vipOrder)

	first, ok := flow.NextPending()
	if !ok || first.ID() != 10000001 {
		t.Fatalf("first pending after requeue = %v, want VIP order 10000001", first)
	}

	second, ok := flow.NextPending()
	if !ok || second.ID() != 10000002 {
		t.Fatalf("second pending after requeue = %v, want normal order 10000002", second)
	}

	if got := vipOrder.Status(); got != OrderStatusPending {
		t.Fatalf("vip order status after requeue = %s, want %s", got, OrderStatusPending)
	}
	if got := normalOrder.Status(); got != OrderStatusPending {
		t.Fatalf("normal order status after requeue = %s, want %s", got, OrderStatusPending)
	}
}

func TestFlowManagerCompleteAppendsAndUpdatesStatus(t *testing.T) {
	flow := NewFlowManager()
	order := NewOrder(10000001, PriorityNormal, OrderStatusProcessing)

	flow.Complete(order)

	completeOrders := flow.CompleteOrders()
	if got, want := len(completeOrders), 1; got != want {
		t.Fatalf("complete orders len = %d, want %d", got, want)
	}
	if got, want := completeOrders[0].ID(), 10000001; got != want {
		t.Fatalf("complete order id = %d, want %d", got, want)
	}
	if got := order.Status(); got != OrderStatusComplete {
		t.Fatalf("order status after complete = %s, want %s", got, OrderStatusComplete)
	}
}
