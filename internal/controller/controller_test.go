package controller

import (
	"bytes"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"
)

func TestVIPOrdersAreDispatchedBeforeNormalOrders(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	normal := c.NewOrder(Normal)
	vip := c.NewOrder(VIP)
	bot := c.AddBot()

	snapshot := c.Snapshot()
	if bot.CurrentOrder == nil || bot.CurrentOrder.ID != vip.ID {
		t.Fatalf("bot current order = %+v, want VIP order %d", bot.CurrentOrder, vip.ID)
	}
	if len(snapshot.Pending) != 1 || snapshot.Pending[0].ID != normal.ID {
		t.Fatalf("pending queue = %+v, want only normal order %d", snapshot.Pending, normal.ID)
	}
}

func TestOrderStatusChangesToProcessingWhenBotPicksOrder(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	order := c.NewOrder(Normal)
	c.AddBot()

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].CurrentOrder == nil {
		t.Fatalf("bots = %+v, want one bot with current order", snapshot.Bots)
	}
	if snapshot.Bots[0].CurrentOrder.ID != order.ID {
		t.Fatalf("current order ID = %d, want %d", snapshot.Bots[0].CurrentOrder.ID, order.ID)
	}
	if snapshot.Bots[0].CurrentOrder.Status != OrderProcessing {
		t.Fatalf("current order status = %s, want %s", snapshot.Bots[0].CurrentOrder.Status, OrderProcessing)
	}
}

func TestSnapshotDoesNotExposeInternalCurrentOrderPointer(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	order := c.NewOrder(Normal)
	c.AddBot()

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].CurrentOrder == nil {
		t.Fatalf("snapshot bots = %+v, want bot with current order", snapshot.Bots)
	}
	snapshot.Bots[0].CurrentOrder.ID = 999
	snapshot.Bots[0].CurrentOrder.Status = OrderComplete

	nextSnapshot := c.Snapshot()
	if nextSnapshot.Bots[0].CurrentOrder.ID != order.ID {
		t.Fatalf("current order ID = %d, want %d", nextSnapshot.Bots[0].CurrentOrder.ID, order.ID)
	}
	if nextSnapshot.Bots[0].CurrentOrder.Status != OrderProcessing {
		t.Fatalf("current order status = %s, want %s", nextSnapshot.Bots[0].CurrentOrder.Status, OrderProcessing)
	}
}

func TestProcessingOrderReturnsToPendingStatusWhenBotIsRemoved(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	order := c.NewOrder(Normal)
	c.AddBot()
	c.RemoveBot()

	snapshot := c.Snapshot()
	if len(snapshot.Pending) != 1 || snapshot.Pending[0].ID != order.ID {
		t.Fatalf("pending = %+v, want returned order %d", snapshot.Pending, order.ID)
	}
	if snapshot.Pending[0].Status != OrderPending {
		t.Fatalf("returned order status = %s, want %s", snapshot.Pending[0].Status, OrderPending)
	}
}

func TestPendingOrdersKeepVIPPriorityAndFIFO(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	normal1 := c.NewOrder(Normal)
	vip1 := c.NewOrder(VIP)
	normal2 := c.NewOrder(Normal)
	vip2 := c.NewOrder(VIP)

	snapshot := c.Snapshot()
	expected := []int{vip1.ID, vip2.ID, normal1.ID, normal2.ID}
	if len(snapshot.Pending) != len(expected) {
		t.Fatalf("pending = %+v, want %d orders", snapshot.Pending, len(expected))
	}
	for i, orderID := range expected {
		if snapshot.Pending[i].ID != orderID {
			t.Fatalf("pending[%d] = order %d, want order %d; pending = %+v", i, snapshot.Pending[i].ID, orderID, snapshot.Pending)
		}
	}
}

func TestRemovingProcessingBotReturnsOrderToPriorityQueue(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	normal := c.NewOrder(Normal)
	c.AddBot()
	vip := c.NewOrder(VIP)

	removed := c.RemoveBot()
	if removed == nil {
		t.Fatal("expected a bot to be removed")
	}

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 0 {
		t.Fatalf("bots = %+v, want no active bots", snapshot.Bots)
	}
	if len(snapshot.Pending) != 2 {
		t.Fatalf("pending count = %d, want 2", len(snapshot.Pending))
	}
	if snapshot.Pending[0].ID != vip.ID || snapshot.Pending[1].ID != normal.ID {
		t.Fatalf("pending order = %+v, want VIP %d before returned normal %d", snapshot.Pending, vip.ID, normal.ID)
	}
}

func TestRemovingProcessingBotReinsertsOrderByIDWithinSamePriorityQueue(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	first := c.NewOrder(Normal)
	second := c.NewOrder(Normal)
	c.AddBot()

	removed := c.RemoveBot()
	if removed == nil {
		t.Fatal("expected a bot to be removed")
	}

	snapshot := c.Snapshot()
	if len(snapshot.Pending) != 2 {
		t.Fatalf("pending count = %d, want 2", len(snapshot.Pending))
	}
	if snapshot.Pending[0].ID != first.ID || snapshot.Pending[1].ID != second.ID {
		t.Fatalf("pending order = %+v, want returned order %d before order %d", snapshot.Pending, first.ID, second.ID)
	}
}

func TestRemovingProcessingBotCancelsCookingImmediately(t *testing.T) {
	originalDuration := processingDuration
	processingDuration = time.Second
	defer func() {
		processingDuration = originalDuration
	}()

	var log bytes.Buffer
	c := NewController(&log)
	defer c.Stop()

	order := c.NewOrder(Normal)
	c.AddBot()
	c.RemoveBot()

	expectedLog := fmt.Sprintf("canceled Normal Order #%d", order.ID)
	deadline := time.After(200 * time.Millisecond)
	for {
		if strings.Contains(log.String(), expectedLog) {
			return
		}
		select {
		case <-deadline:
			t.Fatalf("timed out waiting for cooking cancellation for order %d; logs:\n%s", order.ID, log.String())
		default:
			time.Sleep(10 * time.Millisecond)
		}
	}
}

func TestRemoveBotRemovesNewestBot(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	first := c.AddBot()
	second := c.AddBot()

	removed := c.RemoveBot()
	if removed == nil || removed.ID != second.ID {
		t.Fatalf("removed bot = %+v, want newest bot %d", removed, second.ID)
	}

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].ID != first.ID {
		t.Fatalf("bots = %+v, want only bot %d remaining", snapshot.Bots, first.ID)
	}
}

func TestCompletionCommandFromRemovedBotIsIgnored(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	order := c.NewOrder(Normal)
	c.AddBot()
	c.RemoveBot()
	sendComplete(c, 1, order.ID)

	snapshot := c.Snapshot()
	if len(snapshot.Completed) != 0 {
		t.Fatalf("completed = %+v, want no completed orders after removed bot timer fires", snapshot.Completed)
	}
	if len(snapshot.Pending) != 1 || snapshot.Pending[0].ID != order.ID {
		t.Fatalf("pending = %+v, want returned order %d", snapshot.Pending, order.ID)
	}
}

func TestBotCompletesOrderAndContinuesWithNextPriorityOrder(t *testing.T) {
	c := NewController(io.Discard)
	defer c.Stop()

	normal := c.NewOrder(Normal)
	vip := c.NewOrder(VIP)
	c.AddBot()

	sendComplete(c, 1, vip.ID)
	sendComplete(c, 1, normal.ID)

	snapshot := c.Snapshot()
	if len(snapshot.Completed) != 2 {
		t.Fatalf("completed count = %d, want 2", len(snapshot.Completed))
	}
	if snapshot.Completed[0].ID != vip.ID || snapshot.Completed[1].ID != normal.ID {
		t.Fatalf("completed = %+v, want VIP %d then normal %d", snapshot.Completed, vip.ID, normal.ID)
	}
	for _, order := range snapshot.Completed {
		if order.Status != OrderComplete {
			t.Fatalf("completed order = %+v, want COMPLETE status", order)
		}
	}
	if len(snapshot.Pending) != 0 {
		t.Fatalf("pending = %+v, want empty", snapshot.Pending)
	}
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].Status != BotIdle {
		t.Fatalf("bots = %+v, want one idle bot", snapshot.Bots)
	}
}

func TestBotIsNotLoggedIdleWhenItImmediatelyReceivesAnotherOrder(t *testing.T) {
	var log bytes.Buffer
	c := NewController(&log)
	defer c.Stop()

	normal := c.NewOrder(Normal)
	vip := c.NewOrder(VIP)
	c.AddBot()

	sendComplete(c, 1, vip.ID)

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 1 || snapshot.Bots[0].Status != BotProcessing || snapshot.Bots[0].CurrentOrder == nil || snapshot.Bots[0].CurrentOrder.ID != normal.ID {
		t.Fatalf("bot state = %+v, want processing normal order %d", snapshot.Bots, normal.ID)
	}
	if strings.Contains(log.String(), "Bot #1 is now IDLE") {
		t.Fatalf("bot was logged idle while it had another order; logs:\n%s", log.String())
	}
}

func sendComplete(c *Controller, botID, orderID int) {
	c.commands <- command{kind: cmdCompleteOrder, botID: botID, orderID: orderID}
}
