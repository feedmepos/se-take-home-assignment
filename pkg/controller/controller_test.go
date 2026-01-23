package controller

import (
	"testing"
	"time"

	"example.com/order-controller/pkg/testutil"
)

func TestAddVipOrder(t *testing.T) {
	c := &Controller{}
	c.AddVipOrder()
	if len(c.Pendings) != 1 || c.Pendings[0].orderType != vip {
		t.Error("VIP order not added correctly")
	}
	if c.nextOrderId != 1 {
		t.Error("nextOrderId not incremented")
	}
}

func TestAddNormalOrder(t *testing.T) {
	c := &Controller{}
	c.AddNormalOrder()
	if len(c.Pendings) != 1 || c.Pendings[0].orderType != normal {
		t.Error("Normal order not added correctly")
	}
	if c.nextOrderId != 1 {
		t.Error("nextOrderId not incremented")
	}
}

func TestVIPOrderPriority(t *testing.T) {
	c := &Controller{}
	c.AddNormalOrder()
	c.AddNormalOrder()
	c.AddVipOrder()
	if len(c.Pendings) != 3 {
		t.Error("Orders not added correctly")
	}
	if c.Pendings[0].orderType != vip {
		t.Error("VIP order should be prioritized")
	}
}

func TestAddBot(t *testing.T) {
	c := &Controller{}
	c.AddBot()
	if len(c.Bots) != 1 || c.Bots[0].status != idle {
		t.Error("Bot not added correctly")
	}
	if c.nextBotId != 1 {
		t.Error("nextBotId not incremented")
	}
}

// --- IGNORE ---
func TestRemoveEmptyBot(t *testing.T) {
	c := &Controller{}
	c.RemoveBot()
	if len(c.Bots) != 0 {
		t.Error("Should handle empty bots list")
	}
}

func TestRemoveBot(t *testing.T) {
	c := &Controller{}
	c.AddBot()
	c.RemoveBot()
	if len(c.Bots) != 0 {
		t.Error("Idle bot should be removed")
	}
}

func TestRemoveBotWithOrder(t *testing.T) {
	c := &Controller{}
	c.AddBot()
	c.AddNormalOrder()
	time.Sleep(100 * time.Millisecond)
	c.RemoveBot()
	if len(c.Bots) != 0 {
		t.Error("Bot not removed")
	}
}

func TestProcessNext(t *testing.T) {
	c := &Controller{}
	c.AddBot()
	c.AddNormalOrder()
	time.Sleep(100 * time.Millisecond)
	if len(c.Pendings) != 0 {
		t.Error("processNext should assign pending order to idle bot")
	}
}

func TestHandleCompletedOrder(t *testing.T) {
	oriProcessTime := processTime
	processTime = 100 * time.Millisecond
	defer func() {
		processTime = oriProcessTime
	}()

	c := &Controller{}
	c.AddBot()
	c.AddNormalOrder()
	time.Sleep(processTime * 2)
	if len(c.Completes) != 1 {
		t.Error("Order should be moved to Completes")
	}
	if c.Completes[0].orderType != normal {
		t.Error("Completed order type mismatch")
	}
}

func TestMultipleOrders(t *testing.T) {
	oriProcessTime := processTime
	processTime = 100 * time.Millisecond
	defer func() {
		processTime = oriProcessTime
	}()

	c := &Controller{}
	c.AddBot()
	c.AddNormalOrder()
	c.AddVipOrder()
	c.AddNormalOrder()
	time.Sleep(processTime * 4)
	if len(c.Pendings) != 0 {
		t.Error("All orders should be processed")
	}
	if len(c.Completes) != 3 {
		t.Error("All orders should be in Completes")
	}
	if c.Bots[0].status != idle {
		t.Error("Bot should be idle after processing all orders")
	}
}

func TestProcessNextWithMultipleBots(t *testing.T) {
	oriProcessTime := processTime
	processTime = 100 * time.Millisecond
	defer func() {
		processTime = oriProcessTime
	}()

	c := &Controller{}
	c.AddBot()
	c.AddBot()
	c.AddNormalOrder()
	c.AddNormalOrder()
	time.Sleep(processTime * 4)
	if len(c.Pendings) != 0 && len(c.Completes) != 2 {
		t.Error("Both orders should be completed")
	}
	if c.Bots[0].status != idle || c.Bots[1].status != idle {
		t.Error("Both bots should be idle after processing")
	}
}

func TestRemoveBotDuringProcessing(t *testing.T) {
	c := &Controller{}
	c.AddBot()
	c.AddNormalOrder()
	time.Sleep(50 * time.Millisecond)
	c.RemoveBot()
	if len(c.Bots) != 0 {
		t.Error("Bot should be removed")
	}
	if len(c.Pendings) != 1 {
		t.Error("Interrupted order should return to pending")
	}
}

func TestRemoveBotVIPOrderDuringProcessing(t *testing.T) {
	c := &Controller{}
	c.AddNormalOrder()
	c.AddNormalOrder()
	o3 := c.AddVipOrder()
	o4 := c.AddVipOrder()
	c.AddBot()
	time.Sleep(50 * time.Millisecond)
	c.RemoveBot()

	if len(c.Pendings) != 4 {
		t.Errorf("Expected 4 pending orders, got %d", len(c.Pendings))
	}

	if c.Pendings[0].orderType != vip || c.Pendings[1].orderType != vip {
		t.Error("VIP orders should be prioritized in pending list")
	}

	if c.Pendings[0].id != o4.id || c.Pendings[1].id != o3.id {
		t.Error("VIP orders IDs should be 2 and 3")
	}
}

func TestWaitUntilDoneWithMultipleOrders(t *testing.T) {
	oriProcessTime := processTime
	processTime = 100 * time.Millisecond
	defer func() {
		processTime = oriProcessTime
	}()

	c := &Controller{}
	c.AddBot()
	c.AddVipOrder()
	c.AddNormalOrder()
	c.WaitUntilDone()
	if len(c.Completes) != 2 {
		t.Error("All orders should be completed before WaitUntilDone returns")
	}
}

func TestPrintStatus(t *testing.T) {
	oriProcessTime := processTime
	processTime = 100 * time.Millisecond
	defer func() {
		processTime = oriProcessTime
	}()

	c := &Controller{}
	c.AddBot()
	c.Completes = append(c.Completes, &Order{orderType: vip}, &Order{orderType: normal})
	c.Pendings = append(c.Pendings, &Order{orderType: normal})
	old := testutil.CaptureOutput()
	c.PrintStatus()
	output := old()

	if !testutil.Contains(output, "Total Orders Processed: 2 (1 VIP, 1 Normal)") {
		t.Error("PrintStatus should show correct processed orders")
	}
	if !testutil.Contains(output, "Orders Completed: 2") {
		t.Error("PrintStatus should show correct completed orders")
	}
	if !testutil.Contains(output, "Active Bots: 1") {
		t.Error("PrintStatus should show correct active bots")
	}
	if !testutil.Contains(output, "Pending Orders: 1") {
		t.Error("PrintStatus should show correct pending orders")
	}
}
