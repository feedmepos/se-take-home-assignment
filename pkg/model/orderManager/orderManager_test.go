package orderManager

import (
	"context"
	"mcd/pkg/model/order"
	"testing"
	"time"
)

func TestNewOrderManager(t *testing.T) {
	om := NewOrderManager()

	if om == nil {
		t.Errorf("NewOrderManager should return a non-nil OrderManager")
	}

	if len(om.NormalOrder) != 0 {
		t.Errorf("Expected initial NormalOrder to be empty, got %d", len(om.NormalOrder))
	}

	if len(om.VIPOrder) != 0 {
		t.Errorf("Expected initial VIPOrder to be empty, got %d", len(om.VIPOrder))
	}

	if len(om.CompletedOrder) != 0 {
		t.Errorf("Expected initial CompletedOrder to be empty, got %d", len(om.CompletedOrder))
	}

	if om.GetPendingCount() != 0 {
		t.Errorf("Expected initial pending count to be 0, got %d", om.GetPendingCount())
	}
}

func TestOrderManager_Add(t *testing.T) {
	om := NewOrderManager()

	om.Add("Normal")
	if len(om.NormalOrder) != 1 {
		t.Errorf("Expected NormalOrder count to be 1, got %d", len(om.NormalOrder))
	}

	om.Add("VIP")
	if len(om.VIPOrder) != 1 {
		t.Errorf("Expected VIPOrder count to be 1, got %d", len(om.VIPOrder))
	}

	om.Add("Invalid")
	if len(om.NormalOrder) != 1 || len(om.VIPOrder) != 1 {
		t.Errorf("Invalid order type should not add any orders")
	}

	if om.GetPendingCount() != 2 {
		t.Errorf("Expected pending count to be 2, got %d", om.GetPendingCount())
	}
}

func TestOrderManager_CompleteOrder(t *testing.T) {
	om := NewOrderManager()

	om.Add("Normal")
	normalOrderID := om.NormalOrder[0].ID

	om.CompleteOrder(normalOrderID)
	if len(om.NormalOrder) != 0 {
		t.Errorf("Expected NormalOrder to be empty after completion, got %d", len(om.NormalOrder))
	}

	if len(om.CompletedOrder) != 1 {
		t.Errorf("Expected CompletedOrder to have 1 order, got %d", len(om.CompletedOrder))
	}

	if om.CompletedOrder[0].Status != order.StatusComplete {
		t.Errorf("Expected completed order status to be %s, got %s", order.StatusComplete, om.CompletedOrder[0].Status)
	}

	om.CompleteOrder(999)
	if len(om.CompletedOrder) != 1 {
		t.Errorf("Completing non-existent order should not affect completed orders")
	}
}

func TestOrderManager_TakeOrder(t *testing.T) {
	om := NewOrderManager()

	om.Add("Normal")
	om.Add("VIP")

	ctx := context.Background()

	item, err := om.TakeOrder(ctx)
	if err != nil {
		t.Errorf("TakeOrder should not return error, got %v", err)
	}

	if item == nil {
		t.Errorf("TakeOrder should return a valid order")
	}

	if item.Type != order.TypeVIP {
		t.Errorf("VIP orders should be taken first, got %s", item.Type)
	}

	if item.Status != "PROCESSING" {
		t.Errorf("Taken order status should be PROCESSING, got %s", item.Status)
	}

	order2, err := om.TakeOrder(ctx)
	if err != nil {
		t.Errorf("TakeOrder should not return error, got %v", err)
	}

	if order2.Type != order.TypeNormal {
		t.Errorf("Normal order should be taken after VIP, got %s", order2.Type)
	}

	if om.GetPendingCount() != 0 {
		t.Errorf("Expected pending count to be 0 after taking all orders, got %d", om.GetPendingCount())
	}
}

func TestOrderManager_TakeOrder_Timeout(t *testing.T) {
	om := NewOrderManager()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	order, err := om.TakeOrder(ctx)
	if err == nil {
		t.Errorf("TakeOrder should return error when context times out")
	}

	if order != nil {
		t.Errorf("TakeOrder should return nil order when context times out")
	}
}

func TestOrderManager_ResetOrder(t *testing.T) {
	om := NewOrderManager()

	om.Add("Normal")
	orderID := om.NormalOrder[0].ID

	ctx := context.Background()
	order, err := om.TakeOrder(ctx)
	if err != nil {
		t.Fatalf("TakeOrder failed: %v", err)
	}

	if order.Status != "PROCESSING" {
		t.Errorf("Order should be in processing status after taking")
	}

	om.ResetOrder(orderID)

	if order.Status != "PENDING" {
		t.Errorf("Order status should be reset to PENDING, got %s", order.Status)
	}

	if om.GetPendingCount() != 1 {
		t.Errorf("Pending count should be 1 after reset, got %d", om.GetPendingCount())
	}

	om.ResetOrder(999)
	if om.GetPendingCount() != 1 {
		t.Errorf("Resetting non-existent order should not affect pending count")
	}
}

func TestOrderManager_GetPendingCount(t *testing.T) {
	om := NewOrderManager()

	if om.GetPendingCount() != 0 {
		t.Errorf("Expected initial pending count to be 0, got %d", om.GetPendingCount())
	}

	om.Add("Normal")
	if om.GetPendingCount() != 1 {
		t.Errorf("Expected pending count to be 1 after adding normal order, got %d", om.GetPendingCount())
	}

	om.Add("VIP")
	if om.GetPendingCount() != 2 {
		t.Errorf("Expected pending count to be 2 after adding VIP order, got %d", om.GetPendingCount())
	}

	ctx := context.Background()
	om.TakeOrder(ctx)
	if om.GetPendingCount() != 1 {
		t.Errorf("Expected pending count to be 1 after taking one order, got %d", om.GetPendingCount())
	}

	om.TakeOrder(ctx)
	if om.GetPendingCount() != 0 {
		t.Errorf("Expected pending count to be 0 after taking all orders, got %d", om.GetPendingCount())
	}
}

func TestOrderManager_ConcurrentOperations(t *testing.T) {
	om := NewOrderManager()
	done := make(chan bool)

	go func() {
		for i := 0; i < 5; i++ {
			om.Add("Normal")
			om.Add("VIP")
		}
		done <- true
	}()

	go func() {
		ctx := context.Background()
		for i := 0; i < 5; i++ {
			order, err := om.TakeOrder(ctx)
			if err == nil && order != nil {
				om.CompleteOrder(order.ID)
			}
		}
		done <- true
	}()

	<-done
	<-done

	finalPendingCount := om.GetPendingCount()
	if finalPendingCount < 0 || finalPendingCount > 10 {
		t.Errorf("Expected final pending count between 0 and 10, got %d", finalPendingCount)
	}
}
