package controller

import (
	"se-take-home-assignment/internal/logger"
	"sync"
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

	if ctrl.pendingOrders[0].ID != 1 {
		t.Errorf("Expected order ID 1, got %d", ctrl.pendingOrders[0].ID)
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
	// Expected order: Normal(1), VIP(2), Normal(3)
	// But VIP should be before Normal orders, so: VIP(2), Normal(1), Normal(3)
	// Actually, VIP should be inserted after all existing VIP orders but before all normal orders
	// So: Normal(1), VIP(2), Normal(3) -> VIP(2), Normal(1), Normal(3)

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

func TestOrderController_PrintStatusToStdout(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	// Create some orders
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()

	// Add bots
	ctrl.AddBot()
	ctrl.AddBot()

	// Verify status can be printed without errors
	ctrl.PrintStatusToStdout()

	// Verify counts are correct
	ctrl.mu.Lock()
	if len(ctrl.orders) != 3 {
		t.Errorf("Expected 3 total orders, got %d", len(ctrl.orders))
	}
	if len(ctrl.bots) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(ctrl.bots))
	}
	ctrl.mu.Unlock()

	// Wait for orders to be processed
	time.Sleep(200 * time.Millisecond)

	// Print status again after processing started
	ctrl.PrintStatusToStdout()

	// Wait for completion
	time.Sleep(11 * time.Second)

	// Print final status
	ctrl.PrintStatusToStdout()

	ctrl.mu.Lock()
	if len(ctrl.completedOrders) < 2 {
		t.Errorf("Expected at least 2 completed orders, got %d", len(ctrl.completedOrders))
	}
	ctrl.mu.Unlock()
}

func TestIDGenerator_ConcurrentAccess(t *testing.T) {
	// Test ID generator with high concurrency
	gen := NewIDGenerator(0)

	const numGoroutines = 100
	const idsPerGoroutine = 100
	totalIDs := numGoroutines * idsPerGoroutine

	idsChan := make(chan int, totalIDs)
	var wg sync.WaitGroup

	// Spawn many goroutines to get IDs concurrently
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < idsPerGoroutine; j++ {
				id := gen.GetID()
				idsChan <- id
			}
		}()
	}

	wg.Wait()
	close(idsChan)

	// Collect all IDs
	ids := make([]int, 0, totalIDs)
	for id := range idsChan {
		ids = append(ids, id)
	}

	// Verify we got the expected number of IDs
	if len(ids) != totalIDs {
		t.Errorf("Expected %d IDs, got %d", totalIDs, len(ids))
	}

	// Verify all IDs are unique
	idSet := make(map[int]bool)
	for _, id := range ids {
		if idSet[id] {
			t.Errorf("Duplicate ID found: %d", id)
		}
		idSet[id] = true
	}

	// Verify IDs are increasing (should start from 1)
	minID := ids[0]
	maxID := ids[0]
	for _, id := range ids {
		if id < minID {
			minID = id
		}
		if id > maxID {
			maxID = id
		}
	}

	if minID < 1 {
		t.Errorf("Expected minimum ID >= 1, got %d", minID)
	}

	// Verify IDs are sequential (all IDs from minID to maxID should exist)
	expectedRange := maxID - minID + 1
	if len(idSet) != expectedRange {
		t.Errorf("Expected sequential IDs from %d to %d, but got %d unique IDs", minID, maxID, len(idSet))
	}
}

func TestIDGenerator_UniqueAndIncreasing(t *testing.T) {
	gen := NewIDGenerator(0)

	// Get IDs sequentially
	ids := make([]int, 100)
	for i := 0; i < 100; i++ {
		ids[i] = gen.GetID()
	}

	// Verify IDs are increasing
	for i := 1; i < len(ids); i++ {
		if ids[i] <= ids[i-1] {
			t.Errorf("IDs not increasing: %d <= %d", ids[i], ids[i-1])
		}
	}

	// Verify first ID is correct
	if ids[0] != 1 {
		t.Errorf("Expected first ID to be 1, got %d", ids[0])
	}
}

func TestOrderController_PendingOrdersSortedByID(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	// Create orders in non-sequential order
	ctrl.CreateNormalOrder()  // ID: 1
	ctrl.CreateVIPOrder()     // ID: 2
	ctrl.CreateNormalOrder()   // ID: 3
	ctrl.CreateVIPOrder()     // ID: 4
	ctrl.CreateNormalOrder()   // ID: 5

	ctrl.mu.Lock()
	pendingOrders, _, _ := ctrl.collectOrderData()
	ctrl.mu.Unlock()

	// Verify VIP orders come first and are sorted by ID
	vipCount := 0
	normalStartIndex := -1
	for i, order := range pendingOrders {
		if order.Type == OrderTypeVIP {
			vipCount++
			if i > 0 && pendingOrders[i-1].Type == OrderTypeVIP {
				// Verify VIP orders are sorted by ID
				if order.ID < pendingOrders[i-1].ID {
					t.Errorf("VIP orders not sorted by ID: %d should come after %d", order.ID, pendingOrders[i-1].ID)
				}
			}
		} else {
			if normalStartIndex == -1 {
				normalStartIndex = i
			}
			// Verify normal orders are sorted by ID
			if i > normalStartIndex && pendingOrders[i-1].Type == OrderTypeNormal {
				if order.ID < pendingOrders[i-1].ID {
					t.Errorf("Normal orders not sorted by ID: %d should come after %d", order.ID, pendingOrders[i-1].ID)
				}
			}
		}
	}

	// Verify we have 2 VIP and 3 Normal orders
	if vipCount != 2 {
		t.Errorf("Expected 2 VIP orders, got %d", vipCount)
	}
	if len(pendingOrders)-vipCount != 3 {
		t.Errorf("Expected 3 Normal orders, got %d", len(pendingOrders)-vipCount)
	}

	// Verify VIP orders are before Normal orders
	if normalStartIndex != -1 && normalStartIndex < vipCount {
		t.Errorf("Normal orders should come after VIP orders")
	}

	// Verify specific order: VIP orders should be #2, #4 and Normal should be #1, #3, #5
	expectedOrder := []int{2, 4, 1, 3, 5}
	for i, order := range pendingOrders {
		if order.ID != expectedOrder[i] {
			t.Errorf("Expected order ID %d at position %d, got %d", expectedOrder[i], i, order.ID)
		}
	}
}

func TestOrderController_CompletedOrdersSortedByID(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	// Create and complete orders in non-sequential order
	ctrl.CreateNormalOrder()  // ID: 1
	ctrl.CreateVIPOrder()     // ID: 2
	ctrl.CreateNormalOrder()   // ID: 3
	ctrl.AddBot()
	ctrl.AddBot()
	ctrl.AddBot()

	// Wait for all orders to complete
	time.Sleep(11 * time.Second)

	ctrl.mu.Lock()
	_, completedOrders, _ := ctrl.collectOrderData()
	ctrl.mu.Unlock()

	// Verify completed orders are sorted by ID
	if len(completedOrders) < 3 {
		t.Errorf("Expected at least 3 completed orders, got %d", len(completedOrders))
	}

	for i := 1; i < len(completedOrders); i++ {
		if completedOrders[i].ID < completedOrders[i-1].ID {
			t.Errorf("Completed orders not sorted by ID: %d should come after %d", completedOrders[i].ID, completedOrders[i-1].ID)
		}
	}

	// Verify first completed order has the smallest ID
	if len(completedOrders) > 0 && completedOrders[0].ID != 1 {
		t.Errorf("Expected first completed order ID to be 1, got %d", completedOrders[0].ID)
	}
}

func TestOrderController_ProcessingOrdersSortedByID(t *testing.T) {
	log := logger.New()
	ctrl := NewOrderController(log)

	// Create multiple orders
	ctrl.CreateNormalOrder()  // ID: 1
	ctrl.CreateVIPOrder()     // ID: 2
	ctrl.CreateNormalOrder()   // ID: 3
	ctrl.CreateVIPOrder()     // ID: 4

	// Add bots to start processing
	ctrl.AddBot()
	ctrl.AddBot()

	// Wait a bit for orders to be picked up
	time.Sleep(200 * time.Millisecond)

	ctrl.mu.Lock()
	_, _, processingOrders := ctrl.collectOrderData()
	ctrl.mu.Unlock()

	// Verify processing orders are sorted by ID
	if len(processingOrders) < 2 {
		t.Errorf("Expected at least 2 processing orders, got %d", len(processingOrders))
	}

	for i := 1; i < len(processingOrders); i++ {
		if processingOrders[i].ID < processingOrders[i-1].ID {
			t.Errorf("Processing orders not sorted by ID: %d should come after %d", processingOrders[i].ID, processingOrders[i-1].ID)
		}
	}
}

