package controller

import (
	"se-take-home-assignment/internal/logger"
	"testing"
	"time"
)

func TestOrderController_CreateNormalOrder(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	ctrl.CreateNormalOrder()

	if len(ctrl.pendingOrders) != 1 {
		t.Errorf("Expected 1 pending order, got %d", len(ctrl.pendingOrders))
	}

	if ctrl.pendingOrders[0].Type != OrderTypeNormal {
		t.Errorf("Expected Normal order type")
	}

	if ctrl.pendingOrders[0].ID != 1001 {
		t.Errorf("Expected order ID 1001, got %d", ctrl.pendingOrders[0].ID)
	}
}

func TestOrderController_CreateVIPOrder(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()

	if len(ctrl.pendingOrders) != 3 {
		t.Errorf("Expected 3 pending orders, got %d", len(ctrl.pendingOrders))
	}

	// VIP order should be after first normal order (if any VIP exists) or at position 0
	// Since we added: Normal, VIP, Normal
	// Expected order: Normal(1001), VIP(1002), Normal(1003)
	// But VIP should be before Normal orders, so: VIP(1002), Normal(1001), Normal(1003)
	// Actually, VIP should be inserted after all existing VIP orders but before all normal orders
	// So: Normal(1001), VIP(1002), Normal(1003) -> VIP(1002), Normal(1001), Normal(1003)
	
	// Check that VIP order is before the second normal order
	vipIndex := -1
	for i, order := range ctrl.pendingOrders {
		if order.Type == OrderTypeVIP {
			vipIndex = i
			break
		}
	}

	if vipIndex == -1 {
		t.Errorf("VIP order not found")
	}

	// All orders after VIP should be normal
	for i := vipIndex + 1; i < len(ctrl.pendingOrders); i++ {
		if ctrl.pendingOrders[i].Type != OrderTypeNormal {
			t.Errorf("Expected normal order after VIP at index %d", i)
		}
	}
}

func TestOrderController_AddBot(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	ctrl.AddBot()

	if len(ctrl.bots) != 1 {
		t.Errorf("Expected 1 bot, got %d", len(ctrl.bots))
	}

	if ctrl.bots[0].ID != 1 {
		t.Errorf("Expected bot ID 1, got %d", ctrl.bots[0].ID)
	}
}

func TestOrderController_RemoveBot(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	ctrl.AddBot()
	ctrl.AddBot()

	if len(ctrl.bots) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(ctrl.bots))
	}

	ctrl.RemoveBot()

	if len(ctrl.bots) != 1 {
		t.Errorf("Expected 1 bot after removal, got %d", len(ctrl.bots))
	}

	if ctrl.bots[0].ID != 1 {
		t.Errorf("Expected remaining bot ID 1, got %d", ctrl.bots[0].ID)
	}
}

func TestOrderController_BotProcessesOrder(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	ctrl.CreateNormalOrder()
	ctrl.AddBot()

	// Wait for order to be picked up
	time.Sleep(100 * time.Millisecond)

	ctrl.mu.Lock()
	if len(ctrl.pendingOrders) != 0 {
		t.Errorf("Expected 0 pending orders after bot picks up, got %d", len(ctrl.pendingOrders))
	}
	if ctrl.bots[0].Status != BotStatusProcessing {
		t.Errorf("Expected bot to be processing")
	}
	ctrl.mu.Unlock()

	// Wait for order to complete (10 seconds)
	time.Sleep(11 * time.Second)

	ctrl.mu.Lock()
	if len(ctrl.completedOrders) != 1 {
		t.Errorf("Expected 1 completed order, got %d", len(ctrl.completedOrders))
	}
	if ctrl.bots[0].Status != BotStatusIdle {
		t.Errorf("Expected bot to be idle after completion")
	}
	ctrl.mu.Unlock()
}

func TestOrderController_VIPPriority(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	// Create: Normal, Normal, VIP, Normal
	ctrl.CreateNormalOrder()
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()

	ctrl.mu.Lock()
	// VIP should be at position 0 (before all normal orders)
	if ctrl.pendingOrders[0].Type != OrderTypeVIP {
		t.Errorf("VIP order should be first in queue")
	}
	// All remaining should be normal
	for i := 1; i < len(ctrl.pendingOrders); i++ {
		if ctrl.pendingOrders[i].Type != OrderTypeNormal {
			t.Errorf("Expected normal order at index %d", i)
		}
	}
	ctrl.mu.Unlock()
}

func TestOrderController_RemoveBotWhileProcessing(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	ctrl.CreateNormalOrder()
	ctrl.AddBot()

	// Wait for bot to pick up order
	time.Sleep(200 * time.Millisecond)

	ctrl.mu.Lock()
	orderID := ctrl.bots[0].Order.ID
	ctrl.mu.Unlock()

	// Remove bot while processing
	ctrl.RemoveBot()

	// Wait a bit
	time.Sleep(100 * time.Millisecond)

	ctrl.mu.Lock()
	// Order should be back in pending
	found := false
	for _, order := range ctrl.pendingOrders {
		if order.ID == orderID {
			found = true
			if order.Status != OrderStatusPending {
				t.Errorf("Expected order to be PENDING, got status %d", order.Status)
			}
			break
		}
	}
	if !found {
		t.Errorf("Order should be back in pending queue")
	}
	ctrl.mu.Unlock()
}

